import type { Region } from '../config/region';

// Astro/build only; keep editorial and legal copy out of React navigation bundles.
export type InformationKind = 'about' | 'privacy' | 'terms';
export type InformationContent = {
  title: string;
  description: string;
  h1: string;
  intro: string;
  sections: readonly {
    heading: string;
    paragraphs: readonly string[];
    links?: readonly { label: string; href: string }[];
  }[];
};

const repository = 'https://github.com/librecosta/tool4furry';
const feedback = `${repository}/issues`;
const license = `${repository}/blob/master/LICENSE`;

export const informationContent: Record<Region, Record<InformationKind, InformationContent>> = {
  cn: {
    about: {
      title: '关于 Tool4Furry',
      description: '了解由 LibreCosta 开发的 Tool4Furry：面向 Furry 创作者的浏览器工具箱、当前开发状态与开源代码。',
      h1: '关于 Tool4Furry',
      intro: '为 Furry 创作者，把日常素材处理做得简单、可靠。',
      sections: [
        {
          heading: '从创作中的小事出发',
          paragraphs: ['Tool4Furry 是面向 Furry 创作者的浏览器工具箱，专注日常创作与素材处理。我们希望减少重复操作，让工具的用途、处理范围和结果都清楚可见，把更多时间留给创作本身。'],
        },
        {
          heading: '正在打磨的工具箱',
          paragraphs: ['项目由 LibreCosta 开发。目前 Image Converter 仍在开发预览中，正式工具目录尚无已发布工具。请以工具目录的实际内容为准；开发中的功能不代表已经公开提供的服务。'],
          links: [{ label: '查看工具箱', href: '/tools/' }],
        },
        {
          heading: '代码与反馈',
          paragraphs: ['代码仓库记录实现与开发进展，欢迎通过 GitHub 提交问题。仓库代码按 BSD-3-Clause 许可证提供，使用或再分发时应遵守许可条件；该许可不改变用户素材与处理结果的权利归属。'],
          links: [{ label: 'GitHub 仓库', href: repository }, { label: 'BSD-3-Clause License', href: license }],
        },
      ],
    },
    privacy: {
      title: '隐私说明 · Tool4Furry',
      description: '了解 Tool4Furry 的浏览器本地图片处理、主题偏好存储、网站访问记录与隐私问题反馈渠道。',
      h1: '隐私说明',
      intro: '工具如何处理文件，与访问网站可能产生哪些记录，是两件不同的事。',
      sections: [
        {
          heading: '工具处理的文件',
          paragraphs: [
            '当前开发预览中的 Image Converter 在本地浏览器读入、检查、转换和预览静态 PNG、JPEG、WebP。这些处理不会通过 Tool4Furry 应用后端上传原始图片。当前没有账号或云端用户文件库。',
            '文件与结果由工作区在内存中持有，临时对象 URL 用于缩略图、预览及下载。移除文件或离开页面会释放应用持有的资源；它们不是永久存储或云端备份。刷新或关闭页面不保留工作区任务，请自行下载并保存所需结果。',
          ],
        },
        {
          heading: '主题偏好',
          paragraphs: ['手动选择亮色或深色外观时，网站使用 localStorage 的 t4f.appearance 保存该选择，供刷新及站内导航后恢复。你可以再次切换，或在浏览器设置中清除此站点的网站数据以移除偏好。中国站与国际站分别保存；存储不可用时仍可在当前页面切换。'],
        },
        {
          heading: '访问网站的记录',
          paragraphs: ['网页的托管、CDN 或分发服务可能为交付内容、保障安全和排查故障处理 IP 地址、请求时间、浏览器标识等访问记录，具体范围与保存时间取决于实际服务及配置。当前页面代码未集成第三方访问统计脚本；这不代表托管服务没有日志，也不表示本地图片处理会将图片写入访问记录。'],
        },
        {
          heading: '第三方链接与联系',
          paragraphs: ['打开 GitHub 等外部链接后，你将访问第三方网站，其信息处理适用该网站的规则。隐私问题，以及对我们实际持有的个人信息提出访问、更正或删除请求，可先通过 GitHub Issues 联系维护者。公开问题中只描述请求类型，不要附上图片、IP 地址或身份材料；需要私密沟通时，请先索取合适的联系渠道。'],
          links: [{ label: '联系维护者（GitHub Issues）', href: feedback }],
        },
      ],
    },
    terms: {
      title: '使用条款 · Tool4Furry',
      description: 'Tool4Furry 的使用范围、用户素材与代码许可边界、浏览器处理限制及问题反馈方式。',
      h1: '使用条款',
      intro: '了解工具的使用边界，妥善保留素材与处理结果。',
      sections: [
        {
          heading: '使用范围',
          paragraphs: ['Tool4Furry 按当前可用状态提供浏览器工具，功能以实际页面及工具说明为准。Image Converter 目前仍是开发预览，正式目录尚无已发布工具。请仅处理你拥有权利或已获授权的文件，合法使用工具，尊重他人的著作权、隐私及其他合法权益。'],
        },
        {
          heading: '素材权利与代码许可',
          paragraphs: ['使用工具不会将你对原始素材或转换结果享有的权利转移给 Tool4Furry，也不会赋予你原本没有的第三方素材权利。仓库代码采用 BSD-3-Clause 许可证；它适用于代码的使用与再分发，不表示用户素材或转换结果也适用该许可证。'],
          links: [{ label: '查看代码许可证', href: license }],
        },
        {
          heading: '处理限制与责任',
          paragraphs: ['可用输出格式取决于浏览器的实际能力，文件还须符合工具的格式、尺寸及资源限制。重新编码可能改变色彩、透明效果、文件大小或移除元数据。请保留原件，检查结果后再用于重要用途；不承诺所有设备始终可用或每次处理均无错误。本说明不排除或限制适用法律不允许排除或限制的责任，也不影响用户依法享有的权利。'],
        },
        {
          heading: '更新与联系',
          paragraphs: ['功能和说明会随项目更新而调整，请查看使用时的页面内容。对工具结果或本条款有疑问，可通过 GitHub Issues 联系维护者；不要在公开问题中提交敏感文件或个人信息。'],
          links: [{ label: '反馈问题（GitHub Issues）', href: feedback }],
        },
      ],
    },
  },
  global: {
    about: {
      title: 'About Tool4Furry',
      description: 'Meet Tool4Furry, a browser toolbox for furry creators by LibreCosta. Learn about its focus, development status and open-source code.',
      h1: 'About Tool4Furry',
      intro: 'Simple, reliable tools for the everyday work behind your creations.',
      sections: [
        {
          heading: 'Starting with everyday creative tasks',
          paragraphs: ['Tool4Furry is a browser toolbox for furry creators, focused on creative work and asset processing. We aim to reduce repetitive steps and make each tool’s purpose, limits and results clear, leaving more time for creating.'],
        },
        {
          heading: 'A toolbox in development',
          paragraphs: ['Tool4Furry is developed by LibreCosta. Image Converter is currently a development preview, and the public catalog has no published tools yet. The catalog shows what is actually available; work in progress does not mean a feature is publicly offered.'],
          links: [{ label: 'Browse the toolbox', href: '/tools/' }],
        },
        {
          heading: 'Code and feedback',
          paragraphs: ['The GitHub repository records implementation and progress, and welcomes issue reports. Repository code is provided under the BSD-3-Clause license, subject to its conditions for use and redistribution. This license does not change ownership of your assets or processed results.'],
          links: [{ label: 'GitHub repository', href: repository }, { label: 'BSD-3-Clause License', href: license }],
        },
      ],
    },
    privacy: {
      title: 'Privacy · Tool4Furry',
      description: 'How Tool4Furry handles images in your browser, stores appearance preferences, and distinguishes file processing from website access records.',
      h1: 'Privacy',
      intro: 'Processing your files and visiting the website involve different kinds of information.',
      sections: [
        {
          heading: 'Files processed by the tool',
          paragraphs: [
            'The current Image Converter development preview reads, checks, converts and previews static PNG, JPEG and WebP images locally in your browser. These operations do not upload original images through a Tool4Furry application backend. There are currently no accounts or cloud libraries for user files.',
            'The workspace holds files and results in memory and uses temporary object URLs for thumbnails, previews and downloads. Removing files or leaving the page releases resources held by the application; these are not permanent storage or cloud backups. Refreshing or closing the page does not retain workspace tasks. Download and save any results you need.',
          ],
        },
        {
          heading: 'Appearance preference',
          paragraphs: ['When you choose Light or Dark, the site saves that choice in localStorage under t4f.appearance to restore it after a refresh or site navigation. Change it with the appearance control, or remove it by clearing this site’s data in your browser settings. The CN and Global sites store preferences separately. If storage is unavailable, switching still works for the current page.',
          ],
        },
        {
          heading: 'Website access records',
          paragraphs: ['Hosting, CDN or content delivery services may process access records such as IP addresses, request times and browser identifiers to deliver pages, maintain security and investigate faults. Their scope and retention depend on the actual service and configuration. The current page code does not integrate third-party traffic analytics scripts. This does not mean hosting services keep no logs, or that local image processing places your images in access logs.'],
        },
        {
          heading: 'External links and contact',
          paragraphs: ['Opening a GitHub or other external link takes you to a third-party website with its own information practices. For privacy questions, or to request access to, correction or deletion of personal information we actually hold, contact the maintainers through GitHub Issues. Describe only the type of request publicly. Do not attach images, IP addresses or identity documents; ask for a suitable private contact channel first if needed.'],
          links: [{ label: 'Contact the maintainers (GitHub Issues)', href: feedback }],
        },
      ],
    },
    terms: {
      title: 'Terms · Tool4Furry',
      description: 'Scope of use, rights in your assets, the code license, browser processing limits and ways to contact Tool4Furry maintainers.',
      h1: 'Terms',
      intro: 'Know the limits of the tools, and keep your originals and results safe.',
      sections: [
        {
          heading: 'Scope of use',
          paragraphs: ['Tool4Furry provides browser tools as currently available, with features described on their actual pages. Image Converter remains a development preview; the public catalog has no published tools yet. Process only files you own or are authorized to use. Use the tools lawfully and respect others’ copyright, privacy and other rights.'],
        },
        {
          heading: 'Your assets and the code license',
          paragraphs: ['Using a tool does not transfer your rights in original assets or converted results to Tool4Furry, or grant rights you do not already have in third-party material. Repository code uses the BSD-3-Clause license. It governs the use and redistribution of that code; it does not place your assets or converted files under that license.'],
          links: [{ label: 'Read the code license', href: license }],
        },
        {
          heading: 'Processing limits and responsibility',
          paragraphs: ['Available output formats depend on actual browser capabilities. Files must also meet the tool’s format, dimension and resource limits. Re-encoding may change colors, transparency or file size, and may remove metadata. Keep originals and check results before important use. Availability on every device and error-free processing are not guaranteed. Nothing here excludes or limits liability that applicable law does not allow to be excluded or limited, or affects your statutory rights.'],
        },
        {
          heading: 'Changes and contact',
          paragraphs: ['Features and these explanations may change as the project develops. Refer to the page content available when you use it. Questions about results or these terms can be raised with the maintainers through GitHub Issues. Do not post sensitive files or personal information in public issues.'],
          links: [{ label: 'Report a concern (GitHub Issues)', href: feedback }],
        },
      ],
    },
  },
};
