import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FileDropzone } from '../src/ui/FileDropzone';
import FilesLab from '../src/lab/FilesLab';
import { UiProvider } from '../src/ui/UiProvider';
import { messages } from '../src/i18n/messages';
import { messages as labMessages } from '../src/lab/messages';
import { setViewport } from './setup';

const issueMessages = {
  type: 'Unsupported type',
  size: 'Too large',
  count: 'Too many files',
};
const imageFile = (name = 'a.png') =>
  new File(['test'], name, { type: 'image/png' });
function setup(disabled = false) {
  const onFilesSelected = vi.fn();
  const onRejected = vi.fn();
  const props = {
    label: 'Choose files',
    hint: 'PNG, 2 per selection, at most 4 bytes',
    accept: '.png',
    multiple: true,
    maxFiles: 2,
    maxSizeBytes: 4,
    disabled,
    issueMessages,
    onFilesSelected,
    onRejected,
  };
  const view = render(<FileDropzone {...props} />);
  return {
    ...view,
    props,
    onFilesSelected,
    onRejected,
    input: view.container.querySelector('input')!,
    button: screen.getByRole('button', { name: props.label }),
  };
}
describe('FileDropzone', () => {
  it('delegates original references to workspace validation without duplicate per-file errors', () => {
    const receive = vi.fn();
    const selected = vi.fn();
    const { container } = render(
      <FileDropzone
        label="Workspace"
        accept=".png"
        multiple
        issueMessages={issueMessages}
        onFilesReceived={receive}
        onFilesSelected={selected}
      />,
    );
    const files = [imageFile(), new File(['x'], 'unsupported.txt')];
    fireEvent.change(container.querySelector('input')!, { target: { files } });
    expect(receive).toHaveBeenCalledWith(files);
    expect(selected).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('opens the native input with button, Enter and Space', async () => {
    const user = userEvent.setup();
    const { input, button } = setup();
    const open = vi.spyOn(input, 'click').mockImplementation(() => {});
    await user.tab();
    expect(document.activeElement).toBe(button);
    await user.keyboard('{Enter} ');
    await user.click(button);
    expect(open).toHaveBeenCalledTimes(3);
    expect(button.getAttribute('aria-describedby')).toBe(
      input.getAttribute('aria-describedby'),
    );
    expect(input.type).toBe('file');
  });
  it('delivers the same file repeatedly, resets the input and ignores empty selection', async () => {
    const user = userEvent.setup();
    const { input, onFilesSelected, onRejected } = setup();
    const file = imageFile();
    await user.upload(input, file);
    expect(input.value).toBe('');
    await user.upload(input, file);
    expect(onFilesSelected.mock.calls).toEqual([[[file]], [[file]]]);
    fireEvent.change(input, { target: { files: [] } });
    expect(onFilesSelected).toHaveBeenCalledTimes(2);
    expect(onRejected).not.toHaveBeenCalled();
  });
  it('partially accepts selection, renders escaped errors and clears stale feedback after a valid batch', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const { input, button, onFilesSelected, onRejected } = setup();
    const valid = imageFile();
    const invalid = new File(['test'], '<img src=x onerror=alert(1)>.txt', {
      type: 'text/plain',
    });
    const large = new File(['large'], 'large.png');
    await user.upload(input, [
      invalid,
      valid,
      large,
      imageFile('b.png'),
      imageFile('c.png'),
    ]);
    expect(
      onFilesSelected.mock.calls[0][0].map((file: File) => file.name),
    ).toEqual(['a.png', 'b.png']);
    expect(onRejected.mock.calls[0][0]).toEqual([
      { name: invalid.name, reason: 'type' },
      { name: 'large.png', reason: 'size' },
      { name: 'c.png', reason: 'count' },
    ]);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain(invalid.name);
    expect(alert.querySelector('img')).toBeNull();
    expect(button.getAttribute('aria-describedby')).toContain(alert.id);
    expect(button.getAttribute('aria-invalid')).toBe('true');
    await user.upload(input, valid);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(button.hasAttribute('aria-invalid')).toBe(false);
    await user.upload(input, large);
    expect(screen.getByRole('alert').textContent).toContain('Too large');
    expect(onFilesSelected).toHaveBeenCalledTimes(2);
  });
  it('tracks nested drag boundaries, partially accepts drop and leaves unrelated drops alone', () => {
    const { button, onFilesSelected, onRejected } = setup();
    const file = imageFile();
    const bad = new File(['x'], 'bad.txt');
    const dataTransfer = {
      types: ['Files'],
      files: [file, bad],
      dropEffect: 'none',
    };
    fireEvent.dragEnter(button, { dataTransfer });
    fireEvent.dragEnter(within(button).getByText('Choose files'), {
      dataTransfer,
    });
    fireEvent.dragLeave(within(button).getByText('Choose files'), {
      dataTransfer,
    });
    expect(button.hasAttribute('data-dragging')).toBe(true);
    fireEvent.dragOver(button, { dataTransfer });
    expect(dataTransfer.dropEffect).toBe('copy');
    fireEvent.drop(button, { dataTransfer });
    expect(button.hasAttribute('data-dragging')).toBe(false);
    expect(onFilesSelected).toHaveBeenCalledWith([file]);
    expect(onRejected).toHaveBeenCalledWith([
      { name: 'bad.txt', reason: 'type' },
    ]);
    fireEvent.dragEnter(button, { dataTransfer });
    fireEvent.dragLeave(button, { dataTransfer });
    expect(button.hasAttribute('data-dragging')).toBe(false);
    expect(
      fireEvent.drop(button, {
        dataTransfer: { types: ['text/plain'], files: [] },
      }),
    ).toBe(true);
    expect(fireEvent.drop(document.body, { dataTransfer })).toBe(true);
    expect(onFilesSelected).toHaveBeenCalledTimes(1);
  });
  it('refuses selection/drop while disabled, including disabling during a drag', async () => {
    const user = userEvent.setup();
    const { input, button, onFilesSelected, onRejected, rerender, props } =
      setup();
    const dataTransfer = {
      types: ['Files'],
      files: [imageFile()],
      dropEffect: 'copy',
    };
    fireEvent.dragEnter(button, { dataTransfer });
    rerender(<FileDropzone {...props} disabled />);
    expect(button.hasAttribute('data-dragging')).toBe(false);
    await user.click(button);
    await user.upload(input, imageFile());
    fireEvent.dragOver(button, { dataTransfer });
    expect(dataTransfer.dropEffect).toBe('none');
    fireEvent.drop(button, { dataTransfer });
    fireEvent.change(input, { target: { files: [imageFile()] } });
    expect(onFilesSelected).not.toHaveBeenCalled();
    expect(onRejected).not.toHaveBeenCalled();
  });
  it('hands over references without reading bytes, creating URLs, fetching or persisting', async () => {
    const user = userEvent.setup();
    const { input, onFilesSelected } = setup();
    const read = vi.fn();
    const file = Object.assign(imageFile(), {
      arrayBuffer: read,
      text: read,
      stream: read,
    });
    const fetch = vi.fn();
    const reader = vi.fn();
    const url = vi.fn();
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('FileReader', reader);
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = url;
      },
    );
    const persist = vi.spyOn(Storage.prototype, 'setItem');
    await user.upload(input, file);
    expect(onFilesSelected.mock.calls[0][0][0]).toBe(file);
    for (const forbidden of [read, fetch, reader, url, persist])
      expect(forbidden).not.toHaveBeenCalled();
  });
});
it('keeps the FilesLab queue with its caller and supports repeat, remove and confirmed clear', async () => {
  setViewport();
  const user = userEvent.setup();
  const t = labMessages.cn;
  const { container } = render(
    <UiProvider labels={messages.cn}>
      <FilesLab t={t} header={null} />
    </UiProvider>,
  );
  const input = container.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  const file = imageFile();
  await user.upload(input, file);
  await user.upload(input, file);
  const list = within(screen.getByRole('region', { name: t.fileList }));
  expect(list.getAllByText(file.name)).toHaveLength(2);
  expect(list.getByRole('status').textContent).toContain(`${t.fileRounds}: 2`);
  await user.click(
    list.getAllByRole('button', { name: `${t.remove} ${file.name}` })[0],
  );
  expect(list.getAllByText(file.name)).toHaveLength(1);
  await user.click(list.getByRole('button', { name: t.fileClear }));
  await user.click(screen.getByRole('button', { name: t.cancel }));
  expect(list.getByText(file.name)).toBeTruthy();
  await user.click(list.getByRole('button', { name: t.fileClear }));
  await user.click(
    within(
      screen.getByRole('alertdialog', { name: t.fileClearTitle }),
    ).getByRole('button', { name: t.fileClear }),
  );
  expect(list.getByText(t.fileEmpty)).toBeTruthy();
});
