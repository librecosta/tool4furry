# Tool4Furry — Pixel Icon V1 · 生成规范与 Prompt 归档

本页归档经过实际生成实验、由维护者认可的 Pixel Icon V1 方案，不是新的设计提案。第三节的六条完整英文 Prompt 是唯一原始生成依据，逐字保留；不修改、精简、替换或补写第七款工具的 Prompt。

## 一、Pixel Icon V1 基础生成规则

- 使用严格的 32×32 逻辑像素网格，每个逻辑像素都是大小一致的完整正方形。
- 输出 128×128 PNG，必须由原始网格严格以最近邻插值放大 4 倍。
- 保留硬像素边缘；不允许平滑插值、抗锯齿、模糊边缘、亚像素细节或平滑矢量曲线。所有可见边缘和细节对齐原始网格。
- 每张图只有一个紧凑、统一的图标构图，主体约占画布的 70–75%，居中，四周至少保留 3 个逻辑像素的透明留白；在 32×32 下仍有清晰轮廓。
- 经典手工 2D 像素画风格，平涂与简单的阶梯式明暗，通常使用约 8–12 种协调颜色，保持 1 逻辑像素的深色描边。
- 不使用渐变、抖色或平滑光照；使用真实透明背景的 RGBA PNG，不绘制背景色、底板、边框、地面、场景、棋盘格或投影。
- 工具的主体、配色、美术气质和禁止项以各自完整 Prompt 为准；不规定统一的青绿色、米白色或琥珀色。

## 二、从六条实际 Prompt 提取的统一母本

以下母本仅解释六条已确认 Prompt 的共同结构，不引用最初的 Image Format Conversion Prompt A，也不是新的创作指令。`SUBJECT`、专属美术描述和禁止项由各工具的原始 Prompt 决定，不能擅自统一。

```text
Create a handcrafted pixel-art icon representing [TOOL PURPOSE] for a creative software toolbox.

PIXEL GRID AND OUTPUT:
- Design the artwork on a strict 32 × 32 logical pixel grid.
- Each logical pixel must be a solid square of uniform size.
- Export as a 128 × 128 PNG by scaling the original grid exactly 4× using nearest-neighbor interpolation.
- Preserve hard pixel edges. No anti-aliasing, blurred edges, subpixel details, or smooth vector curves.
- Every visible edge and detail must align with the original 32 × 32 grid.

SUBJECT:
[EXACT TOOL-SPECIFIC SUBJECT FROM THE APPROVED PROMPT]

COMPOSITION:
- Exactly one cohesive icon composition.
- Main subject occupies approximately 70–75% of the logical canvas.
- Centered, with at least 3 logical pixels of transparent padding on all sides.
- Strong silhouette readable at 32 × 32 resolution.

ART DIRECTION:
- Classic handcrafted 2D pixel-art icon.
- Flat colors with simple stepped shading.
- Use a compact, harmonious palette with roughly 8–12 distinct colors.
- Consistent 1-logical-pixel dark outline.
[EXACT TOOL-SPECIFIC ART DIRECTION LINES]
- No gradients, dithering, or smooth lighting.

BACKGROUND:
True transparent alpha background (RGBA PNG).
No colored backdrop, tile, frame, floor, scenery, checkerboard pattern, or cast shadow.

[EXACT TOOL-SPECIFIC NEGATIVE REQUIREMENTS]

The final result must look like authentic hand-placed pixel art, not a downsampled digital illustration.
```

### 母本的固定部分

- 32×32 逻辑像素网格。
- 128×128 PNG，严格最近邻放大 4 倍。
- 每个逻辑像素均为完整的正方形。
- 不允许平滑插值、抗锯齿和亚像素细节。
- 主体居中、四周透明留白。
- 经典手工 2D 像素画风格。
- 简单的阶梯式明暗。
- 通常 8–12 种协调颜色。
- 1 逻辑像素深色描边。
- RGBA 真实透明背景。

### 允许变化的部分

- 物体的具体造型、视角和构思。
- 主色、辅助色和强调色。
- 根据工具功能选择不同的物体组合。
- 对应工具的独特美术气质。
- 与工具语义相关的禁止项。

不同工具应保有各自的配色和主体辨识度。**实际生成时必须优先使用第三节中对应工具的完整 Prompt，而不是让 Codex 重新填充母本。**

## 三、六条经过实验确认的完整 Prompt

以下六条是维护者提供的原始生成依据，未经改写。

### 1. Image Resize & Crop

```text
Create a handcrafted pixel-art icon representing IMAGE RESIZING AND CROPPING for a creative software toolbox.

PIXEL GRID AND OUTPUT:
- Design the artwork on a strict 32 × 32 logical pixel grid.
- Each logical pixel must be a solid square of uniform size.
- Export as a 128 × 128 PNG by scaling the original grid exactly 4× using nearest-neighbor interpolation.
- Preserve hard pixel edges. No anti-aliasing, blurred edges, subpixel details, or smooth vector curves.
- Every visible edge and detail must align with the original 32 × 32 grid.

SUBJECT:
Depict a compact crop-and-resize tool icon. The image should clearly communicate cropping and resizing in a single cohesive object.
You may use a small picture thumbnail, a cropping frame, corner crop marks, resize handles, or a diagonal resize arrow.
The cropping frame or crop corners should be the dominant visual cue.
The final object should feel like one unified icon rather than multiple separate symbols.

COMPOSITION:
- Exactly one cohesive icon composition.
- Main subject occupies approximately 70–75% of the logical canvas.
- Centered, with at least 3 logical pixels of transparent padding on all sides.
- Strong silhouette readable at 32 × 32 resolution.

ART DIRECTION:
- Classic handcrafted 2D pixel-art icon.
- Flat colors with simple stepped shading.
- Use a compact, harmonious palette with roughly 8–12 distinct colors.
- Consistent 1-logical-pixel dark outline.
- Give the icon its own distinctive color identity appropriate for a creative tool.
- Preserve a tasteful, charming, and slightly playful feel, while remaining clean and professional.
- No gradients, dithering, or smooth lighting.

BACKGROUND:
True transparent alpha background (RGBA PNG).
No colored backdrop, tile, frame, floor, scenery, checkerboard pattern, or cast shadow.

Do not include text, letters, labels, interface panels, watermarks, or decorative particles.

The final result must look like authentic hand-placed pixel art, not a downsampled digital illustration.
```

### 2. Palette Extractor

```text
Create a handcrafted pixel-art icon representing COLOR PALETTE EXTRACTION for a creative software toolbox.

PIXEL GRID AND OUTPUT:
- Design the artwork on a strict 32 × 32 logical pixel grid.
- Each logical pixel must be a solid square of uniform size.
- Export as a 128 × 128 PNG by scaling the original grid exactly 4× using nearest-neighbor interpolation.
- Preserve hard pixel edges. No anti-aliasing, blurred edges, subpixel details, or smooth vector curves.
- Every visible edge and detail must align with the original 32 × 32 grid.

SUBJECT:
Depict a compact color-extraction icon. The image should clearly communicate selecting or extracting colors.
You may use an eyedropper, a color swatch strip, a small palette, or a droplet touching a color chip.
The eyedropper or sampling action should be the dominant visual feature.
Keep the composition compact and unified, not like a scattered set of separate objects.

COMPOSITION:
- Exactly one cohesive icon composition.
- Main subject occupies approximately 70–75% of the logical canvas.
- Centered, with at least 3 logical pixels of transparent padding on all sides.
- Strong silhouette readable at 32 × 32 resolution.

ART DIRECTION:
- Classic handcrafted 2D pixel-art icon.
- Flat colors with simple stepped shading.
- Use a compact, harmonious palette with roughly 8–12 distinct colors.
- Consistent 1-logical-pixel dark outline.
- This icon may use a more colorful palette than the others, while still feeling tasteful and controlled.
- Preserve a creative, charming, and polished feeling.
- No gradients, dithering, or smooth lighting.

BACKGROUND:
True transparent alpha background (RGBA PNG).
No colored backdrop, tile, frame, floor, scenery, checkerboard pattern, or cast shadow.

Do not include text, letters, labels, interface panels, watermarks, or decorative particles.

The final result must look like authentic hand-placed pixel art, not a downsampled digital illustration.
```

### 3. Image Compressor

```text
Create a handcrafted pixel-art icon representing IMAGE COMPRESSION for a creative software toolbox.

PIXEL GRID AND OUTPUT:
- Design the artwork on a strict 32 × 32 logical pixel grid.
- Each logical pixel must be a solid square of uniform size.
- Export as a 128 × 128 PNG by scaling the original grid exactly 4× using nearest-neighbor interpolation.
- Preserve hard pixel edges. No anti-aliasing, blurred edges, subpixel details, or smooth vector curves.
- Every visible edge and detail must align with the original 32 × 32 grid.

SUBJECT:
Depict a compact image-compression icon. The image should clearly communicate reducing image size or compressing an image.
You may use a picture thumbnail being pressed inward, bold inward arrows, a tightened frame, or another clear visual metaphor for compression.
Avoid symbols that suggest format conversion, cropping, archiving, or ZIP packaging.
The composition should read as a single unified object with a strong silhouette.

COMPOSITION:
- Exactly one cohesive icon composition.
- Main subject occupies approximately 70–75% of the logical canvas.
- Centered, with at least 3 logical pixels of transparent padding on all sides.
- Strong silhouette readable at 32 × 32 resolution.

ART DIRECTION:
- Classic handcrafted 2D pixel-art icon.
- Flat colors with simple stepped shading.
- Use a compact, harmonious palette with roughly 8–12 distinct colors.
- Consistent 1-logical-pixel dark outline.
- Give the icon a distinct and memorable color identity while keeping it elegant and controlled.
- The mood should feel practical, crisp, and tool-like, with a little visual charm.
- No gradients, dithering, or smooth lighting.

BACKGROUND:
True transparent alpha background (RGBA PNG).
No colored backdrop, tile, frame, floor, scenery, checkerboard pattern, or cast shadow.

Do not include text, letters, labels, interface panels, watermarks, or decorative particles.

The final result must look like authentic hand-placed pixel art, not a downsampled digital illustration.
```

### 4. Comic Page Organizer

```text
Create a handcrafted pixel-art icon representing COMIC PAGE ORGANIZATION for a creative software toolbox.

PIXEL GRID AND OUTPUT:
- Design the artwork on a strict 32 × 32 logical pixel grid.
- Each logical pixel must be a solid square of uniform size.
- Export as a 128 × 128 PNG by scaling the original grid exactly 4× using nearest-neighbor interpolation.
- Preserve hard pixel edges. No anti-aliasing, blurred edges, subpixel details, or smooth vector curves.
- Every visible edge and detail must align with the original 32 × 32 grid.

SUBJECT:
Depict a compact icon for organizing comic pages.
You may use stacked pages, slightly staggered illustrated sheets, a page sequence motif, or layered comic pages with simple panel divisions.
The subject should clearly suggest multiple pages arranged in order.
Do not add text, numbers, file labels, or overly complex comic drawings.
Keep the page stack compact, clear, and readable as a single icon object.

COMPOSITION:
- Exactly one cohesive icon composition.
- Main subject occupies approximately 70–75% of the logical canvas.
- Centered, with at least 3 logical pixels of transparent padding on all sides.
- Strong silhouette readable at 32 × 32 resolution.

ART DIRECTION:
- Classic handcrafted 2D pixel-art icon.
- Flat colors with simple stepped shading.
- Use a compact, harmonious palette with roughly 8–12 distinct colors.
- Consistent 1-logical-pixel dark outline.
- Give the icon its own distinct visual identity; paper-like tones, print-inspired accents, or playful comic-like color hints are welcome if tasteful.
- Preserve a tidy, creative, and slightly whimsical feel.
- No gradients, dithering, or smooth lighting.

BACKGROUND:
True transparent alpha background (RGBA PNG).
No colored backdrop, tile, frame, floor, scenery, checkerboard pattern, or cast shadow.

Do not include text, letters, labels, interface panels, watermarks, or decorative particles.

The final result must look like authentic hand-placed pixel art, not a downsampled digital illustration.
```

### 5. Image Watermark

```text
Create a handcrafted pixel-art icon representing IMAGE WATERMARKING for a creative software toolbox.

PIXEL GRID AND OUTPUT:
- Design the artwork on a strict 32 × 32 logical pixel grid.
- Each logical pixel must be a solid square of uniform size.
- Export as a 128 × 128 PNG by scaling the original grid exactly 4× using nearest-neighbor interpolation.
- Preserve hard pixel edges. No anti-aliasing, blurred edges, subpixel details, or smooth vector curves.
- Every visible edge and detail must align with the original 32 × 32 grid.

SUBJECT:
Depict a compact watermarking icon.
You may use a picture thumbnail combined with a stamp, seal, overlay mark, translucent emblem, or another clear visual metaphor for applying a watermark.
The stamp or overlay action should be immediately understandable.
Avoid using letters, copyright symbols, or literal text as the watermark.
The result should feel like one cohesive icon rather than two unrelated objects.

COMPOSITION:
- Exactly one cohesive icon composition.
- Main subject occupies approximately 70–75% of the logical canvas.
- Centered, with at least 3 logical pixels of transparent padding on all sides.
- Strong silhouette readable at 32 × 32 resolution.

ART DIRECTION:
- Classic handcrafted 2D pixel-art icon.
- Flat colors with simple stepped shading.
- Use a compact, harmonious palette with roughly 8–12 distinct colors.
- Consistent 1-logical-pixel dark outline.
- Give the icon a distinct color identity that feels clear, elegant, and slightly expressive.
- Preserve a clean and creative mood, with a subtle handcrafted charm.
- No gradients, dithering, or smooth lighting.

BACKGROUND:
True transparent alpha background (RGBA PNG).
No colored backdrop, tile, frame, floor, scenery, checkerboard pattern, or cast shadow.

Do not include text, letters, labels, interface panels, generator signatures, or decorative particles.

The final result must look like authentic hand-placed pixel art, not a downsampled digital illustration.
```

### 6. EXIF Metadata

```text
Create a handcrafted pixel-art icon representing IMAGE METADATA for a creative software toolbox.

PIXEL GRID AND OUTPUT:
- Design the artwork on a strict 32 × 32 logical pixel grid.
- Each logical pixel must be a solid square of uniform size.
- Export as a 128 × 128 PNG by scaling the original grid exactly 4× using nearest-neighbor interpolation.
- Preserve hard pixel edges. No anti-aliasing, blurred edges, subpixel details, or smooth vector curves.
- Every visible edge and detail must align with the original 32 × 32 grid.

SUBJECT:
Depict a compact image-metadata icon.
You may use a picture thumbnail combined with a small information tag, a structured data label, a clipped note, or another clear visual metaphor for image information.
The image element should remain the primary object, while the metadata tag should be clearly visible and integrated into the same silhouette.
The metadata should be suggested through tiny blocks, dots, short lines, or tag-like structure, but never actual readable text.

COMPOSITION:
- Exactly one cohesive icon composition.
- Main subject occupies approximately 70–75% of the logical canvas.
- Centered, with at least 3 logical pixels of transparent padding on all sides.
- Strong silhouette readable at 32 × 32 resolution.

ART DIRECTION:
- Classic handcrafted 2D pixel-art icon.
- Flat colors with simple stepped shading.
- Use a compact, harmonious palette with roughly 8–12 distinct colors.
- Consistent 1-logical-pixel dark outline.
- Give the icon its own distinct color character while keeping the palette balanced and tasteful.
- The result should feel neat, structured, and tool-like, while still charming and visually appealing.
- No gradients, dithering, or smooth lighting.

BACKGROUND:
True transparent alpha background (RGBA PNG).
No colored backdrop, tile, frame, floor, scenery, checkerboard pattern, or cast shadow.

Do not include text, letters, labels, interface panels, watermarks, magnifying glasses, or decorative particles.

The final result must look like authentic hand-placed pixel art, not a downsampled digital illustration.
```

## 四、PNG 素材交付规则

每款工具最终交付两张 PNG，统一存放在 `src/assets/tool-icons/`，通过静态导入参与构建，使用 Registry 工具 ID 命名：

| 文件 | 用途 |
| --- | --- |
| `<tool-id>-32.png` | 32×32 原生像素图 |
| `<tool-id>-128.png` | 最近邻放大 4 倍图 |

- 必须是真实 RGBA PNG，背景透明。
- 128×128 必须严格对应原始 32×32 的像素放大结果：每个对齐的 4×4 像素块的 RGBA 值一致，并与对应原生像素完全相同。
- 不允许双线性、双三次、抗锯齿或其他平滑重采样。
- 不转换为 WebP、AVIF 或 JPEG，不进行有损压缩；允许 PNG 自身的无损压缩。
- 不重画、不重新配色、不重新生成已经确认的素材。
- 现有素材文件名不同的，先核对工具对应关系，再按 ID 整理；不覆盖或误替换已有文件。
- 仅有 128×128 图而缺少原生 32×32 时，先检查严格的 4× 像素块一致性；满足才可以通过最近邻缩小恢复 32×32。不满足时报告问题，不擅自修图。
- 本归档不自动替换首页或工具箱图标，不修改 Registry、工具业务或发布状态，不新增生成服务、资源框架或依赖。

### 首次归档检查（2026-11-02）

首次归档时，请求未附带 PNG 文件，仓库未找到六款工具已确认的 Pixel Icon V1 PNG，因此只归档 Prompt，未生成或替换图标。后续素材提供和接入结果如下；品牌、社区、测试夹具和验证截图不作为本批图标素材。

### 七款工具素材接入（2026-11-02）

维护者随后提供七组 32px / 128px PNG，全部验证为 8-bit RGBA、真实透明背景、精确最近邻 4× 像素关系。14 个文件按下表映射接入，后随全站素材整理迁至 `src/assets/tool-icons/`，保留原始文件字节、色彩和 Alpha，没有重编码或重新生成。EXIF 附件实际包含 32px 文件，核对通过后直接复用，无需恢复生成。

| 工具 ID / 正式文件前缀 | 附件前缀 | 已交付 |
| --- | --- | --- |
| `image-converter` | `image-format-conversion` | `-32.png`、`-128.png` |
| `image-resize-crop` | `image-resize-crop` | `-32.png`、`-128.png` |
| `palette-extractor` | `color-palette-extraction` | `-32.png`、`-128.png` |
| `image-compressor` | `image-compression` | `-32.png`、`-128.png` |
| `comic-page-organizer` | `comic-page-organization` | `-32.png`、`-128.png` |
| `image-watermark` | `image-watermarking` | `-32.png`、`-128.png` |
| `exif-metadata` | `image-metadata` | `-32.png`、`-128.png` |

Image Converter 的素材已提供，但它不在本页六条原始 Prompt 范围内；不以旧 Prompt A 补入，也不补写新的生成 Prompt。上述六条英文 Prompt 保持不变。

首页精选、创作身份中的工具入口和工具目录共用 `FeaturedToolIcon.astro`，路径映射统一维护在 `src/site/tool-icons.ts`，供组件与产物检查复用。通过 `srcset` 和显示尺寸选择 32px / 128px，显式宽高、空 `alt`、`object-fit: contain` 与 `image-rendering: pixelated`。未知 ID / DEV Fixture 使用原有中性四宫格回退，不请求不存在的 PNG。身份、分类、Logo、操作按钮与纯文字链接不变。
