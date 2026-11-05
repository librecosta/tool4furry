import type { ToolContentMap } from './tool-content';
// Static Astro content only.
export const generalToolboxContent = {
  'pdf-merge': {
    zh: {
      title: '在线 PDF 合并工具 - 拖拽排序与本地合并 | Tool4Furry',
      description: '免费在线合并多个 PDF 文件，自由调整文件顺序，一键生成并下载合并后的 PDF。无需上传服务器，所有处理均在浏览器本地完成。',
      h1: 'PDF 合并',
      intro: '将多个 PDF 整理成一份文档。添加文件、调整顺序，然后合并下载。',
      steps: [
        '**添加 PDF：** 选择或拖入需要合并的 PDF 文件，可一次添加多个。',
        '**调整顺序：** 拖动文件行改变合并顺序，也可以移除不需要的文件。',
        '**合并文件：** 点击「合并 PDF」，等待浏览器完成处理。',
        '**下载结果：** 合并成功后点击「下载 PDF」，保存生成的文档。',
      ],
      limitations: [
        '支持浏览器本地合并常规 PDF 文件。',
        '最多 100 个文件、累计 96 MiB、单文件 32 MiB，合并后最多 1000 页。',
        '输出 PDF 最大 128 MiB。',
        '不支持加密、损坏或无法正常解析的 PDF。',
        '文件不会上传到服务器，也不会由本站持久保存。',
        '合并耗时和可处理规模受浏览器及设备资源限制。',
      ],
      faq: [
        { question: 'PDF 文件会上传到服务器吗？', answer: '不会。文件读取、排序和合并均在当前浏览器中完成，本站不会接收或持久保存这些文件。' },
        { question: '可以自己调整 PDF 合并顺序吗？', answer: '可以。拖动文件行即可改变顺序，最终 PDF 会按照列表顺序合并。重新排序后需要重新生成合并结果。' },
        { question: '为什么有些 PDF 不能合并？', answer: '损坏、加密、无法解析或超过工具资源限制的文件可能无法处理。可以检查原文件是否能正常打开，以及是否超出文件和页数限制。' },
      ],
    },
    en: {
      title: 'Merge PDF Files Online - Reorder & Download | Tool4Furry',
      description: 'Merge multiple PDF files for free, arrange them in any order, and download the result. All processing happens locally in your browser without uploading files.',
      h1: 'PDF Merge',
      intro: 'Bring multiple PDF files into one document. Add your files, arrange their order, and download the merged result.',
      steps: [
        '**Add PDFs:** Choose or drop the PDF files you want to combine.',
        '**Arrange files:** Drag files to change their order, or remove files you no longer need.',
        '**Merge:** Select Merge and let your browser process the documents.',
        '**Download:** When the merged PDF is ready, select Download to save it.',
      ],
      limitations: [
        'Combines standard PDF files locally in your browser.',
        'Up to 100 files, 96 MiB total, 32 MiB per file, and 1,000 combined pages.',
        'Maximum output size: 128 MiB.',
        'Encrypted, damaged, or unsupported PDFs cannot be processed.',
        'Files are not uploaded or persistently stored by Tool4Furry.',
        'Processing time and available capacity depend on the browser and device.',
      ],
      faq: [
        { question: 'Are my PDF files uploaded to a server?', answer: 'No. Files are read, reordered and merged in your browser. Tool4Furry does not receive or persistently store them.' },
        { question: 'Can I change the order of my PDFs?', answer: 'Yes. Drag the file rows into the order you want. The merged PDF follows that list. Reordering files invalidates the previous result, so merge again before downloading.' },
        { question: "Why can’t some PDFs be merged?", answer: 'Encrypted, damaged, unparseable or oversized files may be rejected. Check that the originals open correctly and stay within the file and page limits.' },
      ],
    },
  },
  'pdf-split': {
    zh: {
      title: '在线 PDF 拆分工具 - 预览选页与提取 PDF | Tool4Furry',
      description: '在线预览 PDF 页面，点击选择或输入页码范围，提取指定页面为一个 PDF，或将选中页面逐页导出为 ZIP。全部在浏览器本地处理，无需上传文件。',
      h1: 'PDF 拆分',
      intro: '预览每一页，选出需要的内容。将选中页面合成 PDF，或逐页打包下载。',
      steps: [
        '**添加 PDF：** 选择或拖入一个 PDF，查看文件信息和页面缩略图。',
        '**选择页面：** 点击缩略图选择需要的页面，也可以通过页码范围快速指定，例如 1-3,5。',
        '**选择输出：** 使用「单个 PDF」将所选页面提取为一份文档，或选择「逐页 ZIP」将每页保存为独立 PDF。',
        '**生成与下载：** 点击「提取 PDF」或「生成 ZIP」，处理完成后下载结果。',
      ],
      limitations: [
        '支持常规 PDF 的指定页面提取，以及将选中页面逐页导出为 ZIP。',
        '单个输入 PDF 最大 32 MiB、最多 1000 页；不支持加密、损坏或无法解析的 PDF。',
        '单个 PDF 输出最大 128 MiB；逐页 ZIP 最多选择 200 页，输出总量上限为 96 MiB。',
        '页码范围支持单页及连续区间；重复、越界或无效范围会被拒绝。',
        '页面预览由浏览器本地渲染。某些 PDF 可能无法显示预览，但仍可能正常提取页面。',
        '文件处理均在浏览器本地完成，不上传服务器，也不会由本站持久保存。性能取决于浏览器和设备。',
      ],
      faq: [
        { question: 'PDF 文件会上传到服务器吗？', answer: '不会。PDF 的读取、页面预览、提取和 ZIP 生成均在当前浏览器本地完成，本站不会接收或持久保存这些文件。' },
        { question: '如何指定需要拆分的页面？', answer: '可以直接点击页面缩略图，也可以输入页码范围。例如 1-3 表示第 1 至第 3 页，1,3,5 表示第 1、3、5 页。手动输入的有效顺序将用于输出；通过缩略图选择时则按原始页码排列。' },
        { question: '单个 PDF 和逐页 ZIP 有什么区别？', answer: '「单个 PDF」将选中的页面组合为一份 PDF；「逐页 ZIP」把每个选中的页面保存成独立 PDF，再统一打包下载。ZIP 内的文件名保留原文档页码。' },
        { question: '为什么有些 PDF 页面无法预览？', answer: '部分 PDF 的内容或编码可能无法在浏览器中正常渲染。如果原文档仍可解析，可以尝试按页码提取；损坏、加密或超出限制的 PDF 则可能无法处理。' },
      ],
    },
    en: {
      title: 'Split PDF Online - Preview & Extract Pages | Tool4Furry',
      description: 'Preview PDF pages, select pages visually or enter page ranges, then download one PDF or a ZIP of individual pages. Processing happens locally in your browser.',
      h1: 'PDF Split',
      intro: 'See each page before you split. Choose what you need, then download one PDF or separate pages in a ZIP.',
      steps: [
        '**Add a PDF:** Select or drop a PDF to load its page previews.',
        '**Select pages:** Click page thumbnails or enter a range such as 1-3,5.',
        '**Choose an output:** Select Single PDF to combine chosen pages, or Per-page ZIP to save them separately.',
        '**Generate and download:** Select Extract or Create ZIP, then download the finished file.',
      ],
      limitations: [
        'Extract selected pages into one PDF or export them as individual PDFs in a ZIP.',
        'Input is limited to 32 MiB and 1,000 pages. Encrypted, damaged or unreadable PDFs are not supported.',
        'Single PDF output is limited to 128 MiB. Per-page ZIP supports up to 200 selected pages and 96 MiB of output.',
        'Invalid, duplicate or out-of-range page selections are rejected.',
        'Page previews render locally. Some pages may fail to preview even when extraction is possible.',
        'Files are processed locally in your browser and are not uploaded or persistently stored. Performance depends on your device.',
      ],
      faq: [
        { question: 'Are my PDF files uploaded?', answer: 'No. Reading, previewing, extracting and creating ZIP files all happen locally in your browser.' },
        { question: 'How can I select pages?', answer: 'Click thumbnails or enter page numbers and ranges. For example, 1-3 selects pages 1 through 3. A valid manually entered order is preserved; thumbnail selection follows the original page order.' },
        { question: 'What is the difference between Single PDF and Per-page ZIP?', answer: 'Single PDF combines selected pages into one document. Per-page ZIP saves each selected page as a separate PDF, preserving its original page number in the filename.' },
        { question: "Why can't I preview some pages?", answer: 'Some documents cannot be rendered correctly by the browser preview engine. Extraction may still work when the original PDF can be parsed.' },
      ],
    },
  },
  'images-to-pdf': {
    zh: {
      title: '图片转 PDF 在线工具 - 拖拽排序与本地生成 | Tool4Furry',
      description: '将多张 PNG、JPG 或 JPEG 图片合成为一份 PDF。支持图片预览、拖拽排序、放大查看和继续添加，保留图片原始比例，所有处理均在浏览器本地完成，无需上传文件。',
      h1: '图片转 PDF',
      intro: '把图片排成想要的顺序，再合成一份 PDF。预览、调整页序，然后生成下载。',
      steps: [
        '**添加图片：** 选择或拖入 PNG、JPEG 图片，可以一次添加多张，也可以继续追加。',
        '**整理顺序：** 在图片画廊中拖动调整页序，点击预览查看细节，移除不需要的图片。',
        '**生成 PDF：** 点击「生成 PDF」，浏览器会按照当前图片顺序创建多页文档。',
        '**下载文件：** 生成完成后点击「下载 PDF」，保存到本地设备。',
      ],
      limitations: [
        '支持静态 PNG、JPG/JPEG 图片，一张图片对应 PDF 中的一页。',
        '图片按画廊顺序生成 PDF，保留原始宽高比例，并处理受支持的图片方向与透明度。',
        '对尺寸特别大的图片，可能按比例调整 PDF 页面坐标以适配文档格式，不因此自动降低原始图片像素精度。',
        '不设置固定的图片张数或累计体积配额；实际可处理规模取决于浏览器解码能力、设备内存及 PDF 库能力。',
        '损坏、无法解码或超出实际处理能力的图片可能导致生成失败。图片和排序会保留，便于检查与重试。',
        '图片读取、预览和 PDF 生成均在浏览器本地完成，不上传或持久保存。PDF 可能保留部分来源图片数据或元数据，不承诺自动清除隐私信息。',
      ],
      faq: [
        { question: '图片会上传到服务器吗？', answer: '不会。图片读取、缩略图预览、排序和 PDF 生成都在当前浏览器中完成，Tool4Furry 不会接收或持久保存这些图片。' },
        { question: '可以调整图片在 PDF 中的顺序吗？', answer: '可以。直接在画廊中拖动图片，就能调整最终 PDF 的页序。也可以放大预览或移除图片。生成结果始终按照当前画廊顺序排列。' },
        { question: '会压缩、裁剪或缩小我的图片吗？', answer: '工具不会为了适配页面而自动裁剪图片或降低原始图片像素精度。对于特别大的图片，可能仅按比例调整 PDF 页面坐标。JPEG 和 PNG 使用现有的直接嵌入流程，不是图片压缩工具。' },
        { question: '为什么有些图片无法生成 PDF？', answer: '图片可能已损坏、编码不受支持，或者超出当前浏览器与设备的解码、内存或 PDF 生成能力。可以移除有问题的图片后重试。工具不会因为超过旧的建议图片数量而直接拒绝。' },
      ],
    },
    en: {
      title: 'Convert Images to PDF - Preview & Reorder | Tool4Furry',
      description: 'Combine PNG and JPEG images into one PDF. Preview images, drag to reorder pages, and download the result locally in your browser. No file uploads required.',
      h1: 'Images to PDF',
      intro: 'Arrange your images in the order you want, preview them, and turn them into a single PDF in your browser.',
      steps: [
        '**Add images:** Choose or drop PNG or JPEG images. Add multiple files at once or append more later.',
        '**Arrange pages:** Drag images to reorder them, open a larger preview, or remove unwanted images.',
        '**Create a PDF:** Select Create PDF to combine the images in their current order.',
        '**Download:** When processing finishes, select Download to save your PDF.',
      ],
      limitations: [
        'Supports static PNG and JPEG images. Each image becomes one PDF page.',
        "Images follow the gallery order. Supported orientation and transparency are preserved, along with each image's aspect ratio.",
        'Very large pages may have their PDF coordinate dimensions scaled proportionally without downsampling the source image pixels.',
        'No fixed image-count or total-file-size quota is imposed. Practical capacity depends on browser decoding, available memory and PDF library capabilities.',
        'Damaged, unsupported or excessively demanding images may fail. Your image selection and order are retained so you can retry.',
        'Files are processed locally in your browser without uploads or persistent storage. Some source image data or metadata may remain embedded in the PDF.',
      ],
      faq: [
        { question: 'Are my images uploaded to a server?', answer: 'No. Image reading, previews, ordering and PDF generation all happen locally in your browser. Tool4Furry does not receive or persistently store your files.' },
        { question: 'Can I change the order of the PDF pages?', answer: 'Yes. Drag images into your preferred order in the gallery. You can preview or remove individual images before creating the PDF. The output follows the current gallery order.' },
        { question: 'Does the tool compress, crop or resize my images?', answer: 'It does not automatically crop or downsample source image pixels to fit a page. Very large PDF pages may use proportionally scaled page coordinates. PNG and JPEG files follow the existing direct-embedding process.' },
        { question: "Why can't I create a PDF from some images?", answer: "A file may be damaged, use an unsupported encoding, or exceed your browser's decoding, memory or PDF-generation capabilities. Remove the problematic image and try again. The old suggested batch-size thresholds are not hard rejection limits." },
      ],
    },
  },
  'zip-manager': {
    zh: {
      title: '在线 ZIP 创建与解压工具 - 文件打包和提取 | Tool4Furry',
      description: '在浏览器本地创建和打开 ZIP 文件。支持文件夹打包、目录浏览、选择文件、单项提取和批量 ZIP 下载。无需上传服务器，保留文件目录结构。',
      h1: 'ZIP 管理',
      intro: '把文件整理成 ZIP，或打开已有压缩包，选择需要的内容下载。',
      steps: [
        '**选择模式：** 切换「创建 ZIP」或「打开 ZIP」，根据需要进行打包或提取。',
        '**添加文件：** 创建模式可以添加文件和文件夹；打开模式选择已有 ZIP。',
        '**浏览与选择：** 在右侧查看目录结构，移除不需要打包的文件，或在打开模式选择需要提取的内容。',
        '**生成与下载：** 创建 ZIP 后下载；打开模式可单独下载文件，也可以将选中项重新打包为 ZIP 下载。',
      ],
      limitations: [
        '支持创建常规 ZIP 归档，保留合法的相对文件路径。创建时最多 500 个文件，单项不超过 32 MiB，累计输入不超过 96 MiB。',
        '生成 ZIP 的输出上限为 128 MiB。当前主要采用原始文件字节打包，不保证减少文件体积。',
        '打开 ZIP 时，归档最大 64 MiB，最多 500 个条目；单项解压大小不超过 32 MiB，累计展开不超过 128 MiB。',
        '批量提取会将所选文件重新打包为 ZIP，仍需满足创建 ZIP 的资源限制；不会直接写入本地文件夹。',
        '不支持加密归档、ZIP64、危险路径、异常压缩比及当前解析器不支持的格式或文件名编码。提取过程会校验文件大小与 CRC32。',
        '文件读取、打包和提取均在浏览器本地完成，不上传或持久保存。空目录不保证保留，实际处理能力受浏览器与设备资源影响。',
      ],
      faq: [
        { question: 'ZIP 文件会上传到服务器吗？', answer: '不会。文件读取、创建 ZIP、浏览归档及提取都在当前浏览器中完成，Tool4Furry 不会接收或持久保存这些文件。' },
        { question: '创建 ZIP 能让文件变小吗？', answer: '不一定。当前工具主要是将文件按原始字节打包到 ZIP 归档中，没有提供压缩等级设置。创建 ZIP 便于整理和传输文件，但不保证体积减小。' },
        { question: '可以只提取 ZIP 中的部分文件吗？', answer: '可以。打开 ZIP 后，可以下载单个文件，也可以勾选需要的文件或文件夹，将所选内容重新打包为一个 ZIP 下载。当前不会直接将整个目录写入本地文件夹。' },
        { question: '为什么有些 ZIP 无法打开？', answer: '加密、ZIP64、损坏、不安全路径、异常压缩比、超出资源限制或使用不受支持的格式和文件名编码，都可能导致读取失败。可以检查压缩包格式，或尝试使用兼容的 ZIP 文件。' },
      ],
    },
    en: {
      title: 'ZIP Creator & Extractor - Browse Files Online | Tool4Furry',
      description: 'Create ZIP archives, browse folders, and extract selected files in your browser. Pack files with their folder paths or download selected ZIP contents without uploads.',
      h1: 'ZIP Manager',
      intro: 'Create a ZIP from your files, or open an existing archive to browse and download what you need.',
      steps: [
        '**Choose a mode:** Select Create ZIP to package files or Open ZIP to browse an archive.',
        '**Add files:** Add files or a folder in Create mode, or choose an existing ZIP in Open mode.',
        '**Browse and select:** Review the folder tree, remove files from a new archive, or select files to extract from an existing one.',
        '**Download:** Create and download a ZIP, download an individual extracted file, or export selected contents as a new ZIP.',
      ],
      limitations: [
        'Create standard ZIP archives while preserving safe relative file paths. Creation supports up to 500 files, 32 MiB per file and 96 MiB of input.',
        'Generated ZIP output is limited to 128 MiB. Files are currently packaged without guaranteed size reduction or configurable compression levels.',
        'Opening supports ZIP archives up to 64 MiB and 500 entries. Each extracted file is limited to 32 MiB, with 128 MiB of total expanded data.',
        'Exporting selected files repackages them into a new ZIP and remains subject to creation limits. It does not write directly to a local folder.',
        'Encrypted archives, ZIP64, unsafe paths, excessive compression ratios, unsupported formats and incompatible filename encodings are rejected. Extracted file sizes and CRC32 checksums are validated.',
        'Processing stays in your browser without uploads or persistent storage. Empty folders may not be preserved, and practical capacity depends on your device and browser.',
      ],
      faq: [
        { question: 'Are my ZIP files uploaded?', answer: 'No. Creating, reading, browsing and extracting ZIP archives all happen locally in your browser. Tool4Furry does not receive or persistently store your files.' },
        { question: 'Will creating a ZIP make my files smaller?', answer: 'Not necessarily. The current tool packages the original file bytes without configurable compression levels. ZIP archives are useful for organizing and transferring files, but smaller output is not guaranteed.' },
        { question: 'Can I extract only some files from a ZIP?', answer: 'Yes. Download an individual file or select files and folders to export them as a new ZIP. The tool does not directly write the extracted directory to your local filesystem.' },
        { question: "Why can't I open some ZIP archives?", answer: 'Encrypted or ZIP64 archives, damaged files, unsafe paths, excessive compression ratios, unsupported formats, incompatible filename encodings and archives beyond the current resource limits may be rejected.' },
      ],
    },
  },
  'batch-file-renamer': {
    zh: {
      title: '批量文件重命名在线工具 - 实时预览与序号命名 | Tool4Furry',
      description: '在浏览器本地批量重命名文件。直接设置统一名称、开启或关闭序号，实时预览新文件名。支持自定义编号与连接符，打包为 ZIP 下载，无需上传文件。',
      h1: '批量文件重命名',
      intro: '轻松整理一批文件的名称。编辑统一名称或序号，实时检查结果，再打包下载。',
      steps: [
        '**添加文件：** 选择或拖入需要整理的文件，可一次添加多个，也可继续追加。',
        '**设置名称：** 在快速模式中填写可选的统一名称，按需要开启或关闭序号。',
        '**预览与调整：** 左侧实时显示新旧文件名；高级模式可调整起始编号、位数与连接符。',
        '**生成与下载：** 确认名称无冲突后生成 ZIP，下载包含新文件名的文件集合。',
      ],
      limitations: [
        '支持批量处理不同类型的普通文件，默认保留各文件原始扩展名。',
        '统一名称可以留空。开启序号时可只使用编号；统一名称和序号均关闭时保留原文件名。',
        '高级模式可设置起始序号、序号位数，以及连接符 -、_、空格或无连接符。',
        '当前最多处理 100 个文件，单文件最大 32 MiB、累计输入最大 96 MiB；ZIP 生成仍受实际输出容量及浏览器资源限制。',
        '无效、过长、违反文件名安全规则或重复的输出名称会阻止生成。不会静默覆盖文件或自行修改用户指定的命名规则。',
        '文件处理均在浏览器本地完成。工具将文件以新名称打包为 ZIP 下载，不直接重命名磁盘原文件，也不会上传或持久保存用户文件。',
      ],
      faq: [
        { question: '可以直接批量修改电脑上的文件名吗？', answer: '当前工具不会直接修改本地磁盘上的文件。它会按照预览中的新名称重新打包文件，并提供 ZIP 下载。原文件保持不变。' },
        { question: '可以不填写统一名称，只添加序号吗？', answer: '可以。统一名称留空且启用编号时，文件会生成类似 001.png、002.jpg 的名称。如果统一名称和编号都关闭，则保持原文件名。' },
        { question: '为什么有些文件无法生成？', answer: '输出名称可能包含非法字符、过长，或者多个文件生成了相同名称。工具会标出对应问题，用户可以修改统一名称或开启编号后重试。' },
        { question: '文件会上传到服务器吗？', answer: '不会。文件读取、命名预览及 ZIP 生成都在当前浏览器中完成，Tool4Furry 不会接收或持久保存这些文件。' },
      ],
    },
    en: {
      title: 'Batch Rename Files Online - Preview & Number | Tool4Furry',
      description: 'Rename multiple files in your browser. Enter an optional shared name, add sequence numbers, preview every result, and download a ZIP without uploading files.',
      h1: 'Batch File Renamer',
      intro: 'Give your files consistent names. Set an optional name and numbering pattern, preview the results, and download them together.',
      steps: [
        '**Add files:** Select or drop the files you want to rename. Add more files at any time.',
        '**Choose a name:** Enter an optional shared name and enable or disable sequence numbers in Quick mode.',
        '**Preview and refine:** Review the new filenames instantly. Use Advanced mode to adjust the starting number, padding and separator.',
        '**Create and download:** Check for conflicts, create a ZIP, and download your files with their new names.',
      ],
      limitations: [
        'Rename batches of ordinary files while preserving each original file extension.',
        'The shared name is optional. Numbering can be used alone, and disabling both options preserves original filenames.',
        'Advanced mode supports a starting number, number padding and separators: hyphen, underscore, space or none.',
        'Up to 100 files are supported, with a 32 MiB per-file and 96 MiB total input limit. ZIP output is also subject to actual capacity and browser resources.',
        'Invalid, excessively long, unsafe or duplicate output filenames prevent export. Files are not silently overwritten or automatically renamed to resolve conflicts.',
        'Processing takes place locally in your browser. Files are packaged under their new names in a downloadable ZIP; original files on disk are unchanged, and nothing is uploaded or persistently stored.',
      ],
      faq: [
        { question: 'Does this rename files directly on my computer?', answer: 'No. The tool creates a ZIP containing copies of your files under their new names. Your original files remain unchanged.' },
        { question: 'Can I use only numbers without entering a name?', answer: 'Yes. Leave the shared name empty and keep numbering enabled to create names such as 001.png and 002.jpg. Disabling both options preserves the original filenames.' },
        { question: "Why can't I export some filenames?", answer: 'A generated name may be invalid, too long or duplicated. Review the highlighted conflicts and adjust your name or numbering settings.' },
        { question: 'Are my files uploaded?', answer: 'No. File reading, filename previews and ZIP creation all take place locally in your browser. Tool4Furry does not receive or persistently store your files.' },
      ],
    },
  },
  'file-hash': {
    zh: {
      title: '在线文件哈希计算器 - MD5、SHA-256 与批量校验 | Tool4Furry',
      description: '免费在线计算文件 MD5、SHA-1、SHA-256、SHA-512 和 CRC32。支持批量文件自动校验、实时进度、哈希比对、复制结果和 TXT 下载，全部在浏览器本地完成。',
      h1: '文件哈希',
      intro: '拖入文件，即刻计算哈希值。支持常用算法、批量处理与完整性比对，无需上传文件。',
      steps: [
        '**添加文件：** 选择或拖入需要校验的文件，可一次添加多个，也可继续追加。',
        '**选择算法：** 默认使用 MD5，也可以选择 SHA-1、SHA-256、SHA-512 或 CRC32。文件添加后自动计算，切换算法后自动重新计算。',
        '**查看与比对：** 在文件列表中查看各项进度和结果。选择文件后，可以复制完整哈希，也可以输入已有校验值进行比对。',
        '**复制或导出：** 复制单个文件哈希，或将已完成的批量结果复制、下载为 TXT 清单。',
      ],
      limitations: [
        '支持 MD5、SHA-1、SHA-256、SHA-512 和 CRC32 五种算法。默认 MD5，可随时切换。',
        '支持多文件自动计算和追加任务。当前使用单 Worker 按顺序处理文件，提供逐项进度、取消及重试。',
        '使用分块读取处理文件，不再设置旧的 32 MiB 固定大小限制。实际处理能力取决于浏览器文件读取、Worker/WebAssembly、设备性能及资源情况。',
        '支持为单个文件输入预期哈希并比较；输入格式需要符合当前算法的十六进制长度。比较不区分大小写。',
        '批量复制与 TXT 下载仅包含当前算法下已完成的结果。失败、取消或尚未完成的文件不会被当成成功结果导出。',
        'MD5 和 SHA-1 不适合抵抗恶意碰撞，CRC32 属于非密码学校验和。哈希值不能单独证明文件来源可信。文件在浏览器本地处理，不上传或持久保存。',
      ],
      faq: [
        { question: 'MD5 和 SHA-256 有什么区别？', answer: '它们都是根据文件内容计算摘要的方法。MD5 常用于传统下载校验和文件对照，但已不适合需要抗碰撞安全性的场景。对安全性要求较高的完整性校验，建议使用来自可信来源的 SHA-256 校验值。' },
        { question: '可以同时计算多个文件吗？', answer: '可以。一次选择多个文件后，工具会自动逐项计算并显示进度。也可以继续添加文件，或切换算法重新计算，无需手动逐个启动。' },
        { question: '如何判断下载的文件是否一致？', answer: '选择文件并计算相应算法的哈希，然后在「哈希比对」中输入可信来源提供的校验值。匹配时显示绿色状态图标，不匹配时显示红色状态图标。匹配不代表文件来源已经获得身份认证。' },
        { question: '文件会上传到服务器吗？', answer: '不会。工具在当前浏览器中分块读取文件并计算摘要。文件内容不会上传到 Tool4Furry，也不会由本站持久保存。TXT 结果仅在用户主动下载时生成。' },
      ],
    },
    en: {
      title: 'File Hash Calculator - MD5, SHA-256 & Batch Checksums | Tool4Furry',
      description: 'Calculate MD5, SHA-1, SHA-256, SHA-512 and CRC32 checksums for multiple files. Compare hashes, copy results or download a TXT list. No file uploads required.',
      h1: 'File Hash',
      intro: 'Drop files to calculate their checksums automatically. Choose an algorithm, compare results and export a list without uploading anything.',
      steps: [
        '**Add files:** Choose or drop one or more files. Add additional files whenever you need.',
        '**Choose an algorithm:** MD5 is selected by default. You can switch to SHA-1, SHA-256, SHA-512 or CRC32. Files are hashed automatically.',
        "**Review and compare:** View each file's progress and checksum. Select a file to copy its full hash or compare it against an expected value.",
        '**Copy or export:** Copy individual hashes or download a TXT list of completed results.',
      ],
      limitations: [
        'Supports MD5, SHA-1, SHA-256, SHA-512 and CRC32. MD5 is the default algorithm.',
        'Multiple files can be added and processed automatically. A single worker handles tasks sequentially with per-file progress, cancellation and retry.',
        'Files are read in chunks without the previous fixed 32 MiB limit. Practical capacity depends on browser file access, Worker/WebAssembly support, available resources and device performance.',
        'Compare individual hashes against expected hexadecimal values of the correct length for the selected algorithm. Comparison is case-insensitive.',
        'Batch copying and TXT exports contain completed checksums for the current algorithm only. Pending, cancelled and failed items are not silently included as successful results.',
        "MD5 and SHA-1 are unsuitable for collision-resistant security applications, and CRC32 is not cryptographic. A matching checksum does not independently authenticate a file's source. Files stay in your browser without uploads or persistent storage.",
      ],
      faq: [
        { question: 'What is the difference between MD5 and SHA-256?', answer: 'Both produce a digest from file contents. MD5 is commonly used for legacy download checks and comparisons but is not suitable for collision-resistant security use. For security-sensitive integrity checks, prefer a SHA-256 checksum obtained from a trusted source.' },
        { question: 'Can I calculate checksums for multiple files?', answer: 'Yes. Add several files at once and the tool automatically calculates each checksum. You can add more files or switch algorithms without starting each calculation manually.' },
        { question: "How do I compare a file's checksum?", answer: "Select the file and enter a trusted reference checksum in the Compare hash field. A green indicator means the values match; a red indicator means they differ. Matching values alone do not authenticate the file's origin." },
        { question: 'Are my files uploaded?', answer: 'No. Files are read in chunks and hashed locally in your browser. Tool4Furry does not upload or persistently store their contents. TXT files are generated only when you choose to download the results.' },
      ],
    },
  },
  'text-cleaner': {
    zh: {
      title: '文本清理 | Tool4Furry',
      description: '清理空白与换行，对比处理前后文本。',
      h1: '文本清理',
      intro: '清理空白与换行，对比处理前后文本。',
      steps: ['输入或粘贴文本', '独立选择清理选项', '比较并复制或下载。'],
      limitations: [
        '最多 50 万个 UTF-16 代码单元。字符、词段及汉字分别统计，分词遵循浏览器语言能力。',
        '所有文件与文本均在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'Text Cleaner | Tool4Furry',
      description:
        'Clean whitespace and line endings, with before-and-after text.',
      h1: 'Text Cleaner',
      intro: 'Clean whitespace and line endings, with before-and-after text.',
      steps: [
        'Enter text',
        'toggle individual cleanup options',
        'compare, copy or download.',
      ],
      limitations: [
        'Up to 500,000 UTF-16 code units. Counts distinguish characters, word segments and Han characters using browser language segmentation.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'text-diff': {
    zh: {
      title: '文本对比 | Tool4Furry',
      description: '逐行比较文本，查看新增与删除内容。',
      h1: '文本对比',
      intro: '逐行比较文本，查看新增与删除内容。',
      steps: ['输入原文与新文本', '选择是否忽略行末空白', '查看并导出差异。'],
      limitations: [
        '每侧最多 10 万字符、4000 行，差异过大时拒绝。统一换行后比较，不是完整 Git 补丁编辑器。',
        '所有文件与文本均在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'Text Diff | Tool4Furry',
      description: 'Compare texts line by line to see additions and removals.',
      h1: 'Text Diff',
      intro: 'Compare texts line by line to see additions and removals.',
      steps: [
        'Enter original and revised text',
        'optionally ignore trailing whitespace',
        'review and export differences.',
      ],
      limitations: [
        'Up to 100,000 characters and 4,000 lines per side. Excessive differences are rejected. Line endings are normalized; this is not a full Git patch editor.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'subtitle-tools': {
    zh: {
      title: '字幕工具 | Tool4Furry',
      description: '转换 SRT 与 WebVTT，整体平移字幕时间。',
      h1: '字幕工具',
      intro: '转换 SRT 与 WebVTT，整体平移字幕时间。',
      steps: ['粘贴字幕', '选择输出格式与毫秒偏移', '检查条目并复制或下载。'],
      limitations: [
        '最多 5000 条、100 万字符。不支持 VTT NOTE/STYLE/REGION；转换 SRT 会提示定位设置丢失，多行文字保留。',
        '所有文件与文本均在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'Subtitle Tools | Tool4Furry',
      description: 'Convert SRT and WebVTT and shift cue timing.',
      h1: 'Subtitle Tools',
      intro: 'Convert SRT and WebVTT and shift cue timing.',
      steps: [
        'Paste subtitles',
        'select format and millisecond offset',
        'review cues and copy or download.',
      ],
      limitations: [
        'Up to 5,000 cues and one million characters. VTT NOTE/STYLE/REGION blocks are unsupported. SRT conversion warns about positioning loss; multiline text is preserved.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'json-formatter': {
    zh: {
      title: 'JSON 格式化 | Tool4Furry',
      description: '校验、格式化或压缩 JSON，保留数字字面量。',
      h1: 'JSON 格式化',
      intro: '校验、格式化或压缩 JSON，保留数字字面量。',
      steps: ['输入 JSON', '选择缩进或压缩', '检查错误并复制下载。'],
      limitations: [
        '最多 50 万字符、128 层嵌套。不支持 JSON Schema 或注释语法。',
        '所有文件与文本均在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'JSON Formatter | Tool4Furry',
      description:
        'Validate, format or minify JSON while preserving numeric literals.',
      h1: 'JSON Formatter',
      intro:
        'Validate, format or minify JSON while preserving numeric literals.',
      steps: [
        'Enter JSON',
        'choose indentation or minification',
        'review errors and copy or download.',
      ],
      limitations: [
        'Up to 500,000 characters and 128 nesting levels. JSON Schema and comments are unsupported.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'url-base64': {
    zh: {
      title: 'URL 与 Base64 | Tool4Furry',
      description: '进行 UTF-8 文本的 URL 编码与 Base64 转换。',
      h1: 'URL 与 Base64',
      intro: '进行 UTF-8 文本的 URL 编码与 Base64 转换。',
      steps: ['选择编解码操作', '输入文本', '复制或下载结果。'],
      limitations: [
        '最多 50 万字符。Base64 需合法填充与 UTF-8；Base64 不是加密，URL 编码作用于文本组件。',
        '所有文件与文本均在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'URL & Base64 | Tool4Furry',
      description: 'Encode or decode UTF-8 text using URL encoding or Base64.',
      h1: 'URL & Base64',
      intro: 'Encode or decode UTF-8 text using URL encoding or Base64.',
      steps: [
        'Choose an operation',
        'enter text',
        'copy or download the result.',
      ],
      limitations: [
        'Up to 500,000 characters. Base64 requires valid padding and UTF-8. Base64 is not encryption; URL encoding operates on a text component.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'timestamp-converter': {
    zh: {
      title: '时间戳转换 | Tool4Furry',
      description: '在 Unix 时间戳、ISO 8601、UTC 与本地时间间转换。',
      h1: '时间戳转换',
      intro: '在 Unix 时间戳、ISO 8601、UTC 与本地时间间转换。',
      steps: [
        '明确选择秒、毫秒或 ISO',
        '输入带明确单位或时区的时间',
        '核对并复制结果。',
      ],
      limitations: [
        '不猜测时间戳单位，不支持闰秒。本地时间以当前浏览器时区显示。',
        '所有文件与文本均在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'Timestamp Converter | Tool4Furry',
      description:
        'Convert Unix timestamps and ISO 8601 into UTC and local time.',
      h1: 'Timestamp Converter',
      intro: 'Convert Unix timestamps and ISO 8601 into UTC and local time.',
      steps: [
        'Choose seconds, milliseconds or ISO explicitly',
        'enter a value with its unit or timezone',
        'review and copy results.',
      ],
      limitations: [
        'Units are never guessed. Leap seconds are unsupported. Local display uses your browser timezone.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'qr-code-generator': {
    zh: {
      title: '二维码生成 | Tool4Furry',
      description: '将文本或网址生成 PNG 与 SVG 二维码。',
      h1: '二维码生成',
      intro: '将文本或网址生成 PNG 与 SVG 二维码。',
      steps: ['输入内容', '设置尺寸与颜色', '生成并下载 PNG 或 SVG。'],
      limitations: [
        '最多 2000 字符、128–2048px。需深色前景、浅色背景和足够对比度，内容越多需要越大尺寸。',
        '所有文件与文本均在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'QR Code Generator | Tool4Furry',
      description: 'Create PNG and SVG QR codes from text or URLs.',
      h1: 'QR Code Generator',
      intro: 'Create PNG and SVG QR codes from text or URLs.',
      steps: [
        'Enter content',
        'set size and colors',
        'generate and download PNG or SVG.',
      ],
      limitations: [
        'Up to 2,000 characters, 128–2048px. Requires a dark foreground, light background and sufficient contrast. Longer content needs larger output.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'color-contrast': {
    zh: {
      title: '颜色与对比度 | Tool4Furry',
      description: '转换 HEX、RGB、HSL 并计算 WCAG 文字对比度。',
      h1: '颜色与对比度',
      intro: '转换 HEX、RGB、HSL 并计算 WCAG 文字对比度。',
      steps: [
        '输入颜色或使用颜色选择器',
        '设置前景与背景',
        '核对 AA/AAA 并复制。',
      ],
      limitations: [
        '只支持不透明 sRGB。大号文字阈值只判断对比度，不测量实际页面字号。',
        '所有文件与文本均在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'Color & Contrast | Tool4Furry',
      description: 'Convert HEX, RGB and HSL and calculate WCAG text contrast.',
      h1: 'Color & Contrast',
      intro: 'Convert HEX, RGB and HSL and calculate WCAG text contrast.',
      steps: [
        'Enter colors or use the picker',
        'set foreground and background',
        'check AA/AAA and copy values.',
      ],
      limitations: [
        'Opaque sRGB only. Large-text thresholds assess contrast, without measuring actual page font sizes.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'audio-trimmer': {
    zh: {
      title: '音频裁切 | Tool4Furry',
      description: '试听音频范围，导出真实 PCM WAV 文件。',
      h1: '音频裁切',
      intro: '试听音频范围，导出真实 PCM WAV 文件。',
      steps: ['导入音频', '设置起点终点并试听', '导出并下载 WAV。'],
      limitations: [
        '输入上限 20 MiB、180 秒、双声道，解码缓冲上限 64 MiB。原生解码可能有额外瞬时内存；不支持 MP3/AAC 输出。',
        '所有文件与文本均在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'Audio Trimmer | Tool4Furry',
      description:
        'Audition an audio selection and export a real PCM WAV file.',
      h1: 'Audio Trimmer',
      intro: 'Audition an audio selection and export a real PCM WAV file.',
      steps: [
        'Import audio',
        'set start and end and audition',
        'export and download WAV.',
      ],
      limitations: [
        'Input limits: 20 MiB, 180 seconds, two channels; decoded buffer limit 64 MiB. Native decoding can use additional transient memory. No MP3/AAC output.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
} satisfies ToolContentMap;
