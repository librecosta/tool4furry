# Image processing capability evidence — V0.4-A

> **历史能力证据**：以下是原生三格式的早期环境与当时发布判断，不是当前格式/状态矩阵。Image Converter 已在 D2 成为唯一 Published，支持受限 AVIF，CN/Global 均未部署；当前能力、默认隐私和证据入口见 [Converter 当前说明](image-converter-implementation.md)。本页保留原测量与待验项，现行门禁采用 [L1/L2/L3](../AGENTS.md#mvp-beta-release-policy-2026-10-10)。

## 当前 MVP Beta 政策（2026-10-10）

按 [AGENTS.md 的 L1/L2/L3 政策](../AGENTS.md#mvp-beta-release-policy-2026-10-10) 验收：日常按改动风险定向验证，完整 CI 优先交给 GitHub Actions；Beta 必须满足 CI、真实 Chromium 完整流程、输出真实性、桌面/常见手机视口、能力检测安全失败、无已知阻断问题及维护者最终确认。

Firefox、Safari/WebKit、iOS/Android 真机全面验证及全设备资源上限验证不再是 Beta 强制前置条件，转为 L3 按反馈推进的兼容性待办；未测平台和阈值局限仍须准确披露，安全与格式检查不变。Image Converter 仍为 draft，待视觉打磨及维护者验收后另行决定是否发布。

以下 A/B 实测数据与原门禁表保留为历史记录；其中冲突的强制跨浏览器发布要求由新政策取代，不代表新增测试已通过。

A 阶段的结论是：**已测 Windows 内置 Chromium 可原生完成本次 PNG/JPEG/WebP 编码；不据此承诺其他浏览器，也不引入 WASM fallback。** 这不是三款工具的发布验收。

## 可复现的探测

在仓库根目录执行 `python -m http.server 4387 --bind 127.0.0.1 --directory scripts/spikes`，打开 `http://127.0.0.1:4387/image-capabilities.html`，点击 Run local probe。页面只在用户点击后测试自己生成的 32×32 四象限颜色/透明度图，不读取用户文件、不上传、不持久化、不创建 Object URL；参考文件来自同一生成程序的首次受控输出，总计 1572 字节。固定参考文件的导入测试与当前浏览器编码测试分开执行。

代码在 `scripts/spikes/`，不被 src 或 public 引用，不生成站点路由。`.js` 扩展名用于兼容本机 Python HTTP Server；本机 MIME 数据库把 `.mjs` 当作 text/plain，已据实修正测试页面加载方式，不影响 Astro 配置。

完整实测数据见 [image-capabilities-chromium.json](evidence/image-capabilities-chromium.json)。测试时间为 2026-10-09 晚间（Asia/Shanghai），UA 报告 Windows NT 10.0 / Win64 / Chrome 155.0.0.0；这是内置 Chromium 桌面浏览器，不是手机、Firefox 或 WebKit。

## 实测结果

| 项目 | 固定参考输入解码 | 本次导出 MIME / 文件头 / 可解码性 | 输出大小 | 透明位置像素 RGBA |
| --- | --- | --- | ---: | --- |
| PNG | 32×32 成功 | image/png / PNG / 32×32 成功 | 158 B | [0,0,0,0] |
| JPEG | 32×32 成功 | image/jpeg / FF D8 FF / 32×32 成功 | 780 B | 白底填充后 [255,255,255,255] |
| WebP | 32×32 成功 | image/webp / RIFF…WEBP / 32×32 成功 | 634 B | [0,0,0,0] |
| 不支持的 image/x-tool4furry-unsupported | 不适用 | 实际回退 image/png；判定 requested format 不支持 | 158 B | 不作为目标格式成功 |

PNG/WebP 的半透明蓝色像素均为 [0,0,255,128]；JPEG 白底合成后为 [128,127,255,255]。WebP 红色像素从 [224,48,48,255] 变为 [225,47,48,255]，直接说明此次有损编码不能宣传为像素无损。JPEG 使用质量 0.88，WebP 为 0.85；这些是探测参数，不是所有工具/图片的质量承诺，PNG 不需要质量滑块。

固定 WebP 参考文件由本机 HTTP 服务声明为 `application/octet-stream`，但文件签名为 WebP 且实际解码成功。报告中的 imports.matches=false 表示传输 MIME 与格式不一致，**不是解码失败**；`decodeSupported=true` 独立记录了导入结果。输入 MIME/后缀只作线索，输出 MIME 则必须与请求及实际编码相符。

- 0×0 Canvas 的 toBlob 返回 null，未标记成功。
- 仅包含 PNG 文件头的损坏输入触发 `InvalidStateError: The source image could not be decoded.`。
- 有界 2048×2048（4,194,304 像素）PNG 往返成功，输出 88,732 B，解码宽高相符；**没有探索最大边长、总像素、并发内存或移动上限**，不可将 2048 用作通用设备限制。
- 本次创建/关闭 ImageBitmap 均为 8；临时 Canvas 归零。没有使用 Object URL，不能把这项测试说成已验证真实工具的 URL 生命周期。
- `tests/encoding-verdict.test.ts` 额外验证“请求 WebP、实际 PNG”和“谎报 WebP MIME、字节却是 PNG”均不能通过输出格式判断。文件头只是探测线索，真实完成条件还包括可解码性和预期尺寸。

## 历史支持矩阵与原 B/C/D 发布门禁

| 环境/能力 | 状态 | 后续要求 |
| --- | --- | --- |
| 已测 Windows Chromium 155，32px 样本及 2048² PNG | 本次通过 | B 工具接入时重验真实文件、下载名、参数/结果版本 |
| Firefox | 未验证；当前浏览器工具没有该环境 | B 发布前实际运行本探测与真实工具流程 |
| 桌面 WebKit / Safari | 未验证；当前浏览器工具没有该环境 | 同上，不能用 Chromium 结论替代 |
| iOS Safari / Android Chrome 真机 | 未验证 | 解码/编码、触摸/软键盘、安全区、内存预算、异常恢复 |
| EXIF Orientation、ICC/C2PA/元数据、广色域、照片质量 | 未验证 | 确立单一方向处理负责人，说明重新编码可能丢失元数据/改变颜色 |
| APNG、动画 WebP、GIF、HEIC/AVIF/TIFF/SVG | 未实现/未验证 | 首批拒绝不支持的类型；动画必须可靠识别，不能静默取首帧 |
| 大图极限、连续处理、取消/卸载后的全部资源清理 | 未验证 | B/C/D 用真实组件、源文件和目标设备测量，冻结可解释资源预算 |

目前没有证据要求 A 阶段引入第三方 WebP 编码器。若后续目标浏览器编码能力缺失，应限制可用格式或阻断该环境发布，再独立评估按需 fallback 的体积与性能；不得把 PNG 改后缀冒充 WebP。

最终输出合同：完成结果包含 Blob、实际 MIME、宽高、字节数、建议文件名以及 sourceRevision/settingsRevision/requestId；只有格式校验与解码通过且属于当前 ready 请求时可下载。JPEG 默认白底且明确提示，输出不保证更小或无损。过期完成只释放资源，不覆盖当前结果；仍被预览使用的 URL 不可提前撤销。实际组件及图片业务算法在 B/C/D 实施，A 没有创建空壳图像编辑框架。

## 官方依据与实测的区别

[toBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob) 描述目标格式不支持时可回退 PNG，因此探测核对实际 Blob.type；[createImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap) 用于实际解码，不能以浏览器能显示某格式推定其可编码。[ImageBitmap.close](https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap/close) 与 [URL.revokeObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static) 分别负责资源释放。[Canvas 尺寸说明](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas#maximum_canvas_size) 提醒上限随环境变化。以上规范说明不是未测设备的通过证据。
## V0.4-B 补充证据（2026-10-10）

以上 A 阶段事实保持不变。B 已新增真实 Converter 草稿及结构/动画/EXIF 1–8、透明度、下载、连续处理和资源所有权验证；详见 [Image Converter 实施记录](image-converter-implementation.md) 与 `docs/evidence/converter-v04b/`。本次仍只实际访问 Windows Chromium 155，不能把桌面窄视口写成手机验收。16MP 与 8192px 样本通过不等于全设备安全上限；20 MiB/16MP/8192px 仍是开发保护候选。Firefox、Safari/WebKit、iOS/Android 真机发布门禁未完成，Registry 保持 draft，正式目录仍无工具。
