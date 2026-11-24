import type { ReactNode } from 'react';
import { Menu } from '@base-ui/react/menu';
import {
  ArrowUUpLeftIcon, ArrowUUpRightIcon, CaretDownIcon, CodeBlockIcon, CodeIcon, ColumnsIcon, CornersInIcon,
  CornersOutIcon, DotsThreeIcon, DownloadSimpleIcon, EyeIcon, FolderOpenIcon, ImageIcon, LinkSimpleIcon,
  ListBulletsIcon, ListChecksIcon, ListNumbersIcon, NotePencilIcon, QuotesIcon, TableIcon, TextBIcon,
  TextHIcon, TextItalicIcon, TextStrikethroughIcon,
} from '@phosphor-icons/react';
import { IconButton } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import menu from '../../styles/menu.module.scss';
import type { Format } from './commands';
import s from './markdown.module.scss';

export type ViewMode = 'editor' | 'split' | 'preview';
type Translate = (zh: string, en: string) => string;

function Icon({ label, children, onClick, pressed, disabled, className }: {
  label: string; children: ReactNode; onClick: () => void; pressed?: boolean; disabled?: boolean; className?: string;
}) {
  return <Tooltip content={label}><IconButton
    label={label} variant="ghost" size="sm" className={[s.iconButton, className].filter(Boolean).join(' ')}
    aria-pressed={pressed} disabled={disabled} onClick={onClick}
  >{children}</IconButton></Tooltip>;
}

function Dropdown({ label, icon, children, primary = false, className = '' }: {
  label: string; icon: ReactNode; children: ReactNode; primary?: boolean; className?: string;
}) {
  return <Menu.Root modal={false}>
    <Tooltip content={label}>
      <Menu.Trigger
        aria-label={label}
        className={[s.iconButton, primary && s.exportButton, className].filter(Boolean).join(' ')}
      >{icon}</Menu.Trigger>
    </Tooltip>
    <Menu.Portal>
      <Menu.Positioner align="end" sideOffset={6} collisionPadding={12} className={menu.positioner}>
        <Menu.Popup aria-label={label} className={[menu.popup, s.menu].join(' ')}>{children}</Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  </Menu.Root>;
}

export function Toolbar({ t, mode, onMode, fullscreen, onFullscreen, onOpen, undo, redo, canUndo, canRedo,
  onFormat, onFind, onClear, onSample, onDeliver, busy, allowImages, onImages, notices,
}: {
  t: Translate; mode: ViewMode; onMode: (mode: ViewMode) => void; fullscreen: boolean;
  onFullscreen: () => void; onOpen: () => void; undo: () => void; redo: () => void;
  canUndo: boolean; canRedo: boolean; onFormat: (format: Format) => void; onFind: () => void;
  onClear: () => void; onSample: () => void; onDeliver: (format: 'md' | 'html', download: boolean) => void;
  busy: boolean; allowImages: boolean; onImages: (allow: boolean) => void;
  notices: { markdown: string; editor: string };
}) {
  const emphasis = [
    { id: 'bold', label: t('粗体', 'Bold'), icon: TextBIcon },
    { id: 'italic', label: t('斜体', 'Italic'), icon: TextItalicIcon },
    { id: 'strike', label: t('删除线', 'Strikethrough'), icon: TextStrikethroughIcon },
  ] as const;
  const structure = [
    { id: 'bullet', label: t('无序列表', 'Bulleted list'), icon: ListBulletsIcon },
    { id: 'ordered', label: t('有序列表', 'Numbered list'), icon: ListNumbersIcon },
    { id: 'task', label: t('任务列表', 'Task list'), icon: ListChecksIcon },
    { id: 'quote', label: t('引用', 'Blockquote'), icon: QuotesIcon },
    { id: 'link', label: t('链接', 'Link'), icon: LinkSimpleIcon },
    { id: 'image', label: t('图片', 'Image'), icon: ImageIcon },
    { id: 'inlineCode', label: t('行内代码', 'Inline code'), icon: CodeIcon },
    { id: 'codeBlock', label: t('代码块', 'Code block'), icon: CodeBlockIcon },
    { id: 'table', label: t('表格', 'Table'), icon: TableIcon },
  ] as const;
  const views = [
    { id: 'editor', label: t('编辑', 'Editor'), icon: NotePencilIcon },
    { id: 'split', label: t('分栏', 'Split'), icon: ColumnsIcon },
    { id: 'preview', label: t('预览', 'Preview'), icon: EyeIcon },
  ] as const;
  const menuAction = (label: string, action: () => void, className?: string) =>
    <Menu.Item key={label} className={[menu.item, className].filter(Boolean).join(' ')} onClick={action}>{label}</Menu.Item>;
  const formatIcon = ({ id, label, icon: Glyph }: typeof structure[number] | typeof emphasis[number], className?: string) =>
    <Icon key={id} label={label} onClick={() => onFormat(id)} className={className}><Glyph size={18} /></Icon>;
  const levels = () => ([1, 2, 3, 4, 5, 6] as const).map(level =>
    menuAction(t(`${level} 级标题`, `Heading ${level}`), () => onFormat(level)));
  return <div className={s.toolbar} role="group" aria-label={t('Markdown 工具栏', 'Markdown toolbar')}>
    <div className={s.cluster}>
      <Icon label={t('打开文件', 'Open file')} onClick={onOpen}><FolderOpenIcon size={19} /></Icon>
      <Icon label={t('撤销', 'Undo')} onClick={undo} disabled={!canUndo}><ArrowUUpLeftIcon size={18} /></Icon>
      <Icon label={t('重做', 'Redo')} onClick={redo} disabled={!canRedo}><ArrowUUpRightIcon size={18} /></Icon>
    </div>
    <div className={s.cluster}>
      <Dropdown label={t('标题级别', 'Heading level')} icon={<><TextHIcon size={17} /><CaretDownIcon size={10} /></>} className={s.smallHide}>
        {menuAction(t('正文', 'Body text'), () => onFormat('body'))}
        {levels()}
      </Dropdown>
      {emphasis.map(item => formatIcon(item, item.id === 'bold' ? undefined : s.smallHide))}
    </div>
    <div className={`${s.cluster} ${s.structure}`}>
      {structure.slice(0, 4).map(item => formatIcon(item))}
    </div>
    <div className={`${s.cluster} ${s.structure}`}>
      {structure.filter(item => item.id !== 'image' && item.id !== 'codeBlock').slice(4).map(item => formatIcon(item))}
    </div>
    <Dropdown label={t('更多操作', 'More actions')} icon={<DotsThreeIcon size={21} weight="bold" />}>
      {menuAction(t('查找与替换', 'Find and replace'), onFind)}
      {menuAction(t('图片', 'Image'), () => onFormat('image'))}
      {menuAction(t('代码块', 'Code block'), () => onFormat('codeBlock'))}
      {menuAction(t('分割线', 'Horizontal rule'), () => onFormat('rule'))}
      <Menu.Group className={s.smallShow}>
        <Menu.GroupLabel className={menu.label}>{t('文字格式', 'Text formatting')}</Menu.GroupLabel>
        {menuAction(t('正文', 'Body text'), () => onFormat('body'))}
        {levels()}
        {emphasis.slice(1).map(item => menuAction(item.label, () => onFormat(item.id)))}
      </Menu.Group>
      <Menu.Group className={s.structureMenu}>
        <Menu.GroupLabel className={menu.label}>{t('段落与插入', 'Structure and insertion')}</Menu.GroupLabel>
        {structure.filter(item => item.id !== 'image' && item.id !== 'codeBlock')
          .map(item => menuAction(item.label, () => onFormat(item.id)))}
      </Menu.Group>
      <Menu.Separator className={s.menuLine} />
      {menuAction(t('清空文档', 'Clear document'), onClear)}
      {menuAction(t('载入示例', 'Load example'), onSample)}
      <Menu.CheckboxItem className={menu.item} checked={allowImages} onCheckedChange={onImages}>
        <Menu.CheckboxItemIndicator className={s.check} aria-hidden="true">✓</Menu.CheckboxItemIndicator>
        {t('允许加载远程图片', 'Allow remote images')}
      </Menu.CheckboxItem>
      <p className={menu.note}>{t('远程图片会向第三方发送请求，可能暴露你的 IP。仅对当前文档有效。', 'Remote images make requests to third parties and may reveal your IP. This applies only to the current document.')}</p>
      <Menu.Separator className={s.menuLine} />
      <Menu.LinkItem className={menu.item} href={notices.markdown} target="_blank" rel="noreferrer">{t('Markdown 组件许可', 'Markdown component licenses')}</Menu.LinkItem>
      <Menu.LinkItem className={menu.item} href={notices.editor} target="_blank" rel="noreferrer">{t('CodeMirror 核心许可', 'CodeMirror core licenses')}</Menu.LinkItem>
    </Dropdown>
    <div className={s.viewCluster} role="group" aria-label={t('文档视图', 'Document views')}>
      {views.map(({ id, label, icon: Glyph }) => <Icon key={id} label={label} pressed={mode === id} onClick={() => onMode(id)}><Glyph size={17} /></Icon>)}
    </div>
    <Icon label={fullscreen ? t('退出全屏', 'Exit fullscreen') : t('全屏', 'Fullscreen')} onClick={onFullscreen} pressed={fullscreen}>
      {fullscreen ? <CornersInIcon size={18} /> : <CornersOutIcon size={18} />}
    </Icon>
    <Dropdown label={t('复制与下载', 'Copy and download')} icon={<DownloadSimpleIcon size={19} />} primary>
      <Menu.Item className={menu.item} onClick={() => onDeliver('md', false)}>{t('复制 Markdown', 'Copy Markdown')}</Menu.Item>
      <Menu.Item className={menu.item} onClick={() => onDeliver('md', true)}>{t('下载 Markdown', 'Download Markdown')}</Menu.Item>
      <Menu.Separator className={s.menuLine} />
      <Menu.Item className={menu.item} disabled={busy} onClick={() => onDeliver('html', false)}>{t('复制 HTML', 'Copy HTML')}</Menu.Item>
      <Menu.Item className={menu.item} disabled={busy} onClick={() => onDeliver('html', true)}>{t('下载 HTML', 'Download HTML')}</Menu.Item>
    </Dropdown>
  </div>;
}
