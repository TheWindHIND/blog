// 🛡️ 本文件由 XingHuiSama 控制台自动生成，请勿手动修改
export interface Photo { url: string; caption?: string; }

// 6 种纯 CSS 动画模式
export type AnimationMode =
  | 'spatial-rift'      // 时空裂隙
  | 'card-flip'         // 卡片翻转
  | 'slide-switch'      // 滑动切换
  | 'fade-zoom'         // 淡入缩放
  | 'page-turn'         // 仿真翻页
  | 'carousel-3d';      // 3D 走马灯

export interface Album {
  id: string;
  title: string;
  description?: string;
  cover: string;
  date: string;
  photos: Photo[];
  animationMode?: AnimationMode;
}

export const albums: Album[] = [
  {
    "animationMode": "card-flip",
    "title": "5",
    "cover": "https://i.stardots.io/blogimg111/StarDots-2026081714094666410.png",
    "id": "album_1786946989986",
    "photos": [
      { "url": "https://i.stardots.io/blogimg111/StarDots-2026081714101489022.png", "caption": "" },
      { "url": "https://i.stardots.io/blogimg111/StarDots-2026081714101463097.png", "caption": "" },
      { "url": "https://i.stardots.io/blogimg111/StarDots-2026081714101563208.png", "caption": "" },
      { "url": "https://i.stardots.io/blogimg111/StarDots-2026081714101802389.png", "caption": "" }
    ],
    "date": "2026-08-17"
  },
  {
    "animationMode": "slide-switch",
    "title": "测试2",
    "cover": "https://i.stardots.io/blogimg111/StarDots-2026081714075592135.jpg",
    "id": "album_1786946881218",
    "photos": [
      { "url": "https://i.stardots.io/blogimg111/StarDots-2026081714083582837.jpg", "caption": "" },
      { "url": "https://i.stardots.io/blogimg111/StarDots-2026081714085903703.jpg", "caption": "" },
      { "url": "https://i.stardots.io/blogimg111/StarDots-2026081714090646996.png", "caption": "" }
    ],
    "date": "2026-08-17"
  },
  {
    "title": "测试1",
    "cover": "https://i.stardots.io/blogimg111/StarDots-2026081714041381724.png",
    "id": "album_1786946660300",
    "animationMode": "fade-zoom",
    "photos": [
      { "url": "https://i.stardots.io/blogimg111/StarDots-2026081714044315792.png", "caption": "" },
      { "url": "https://i.stardots.io/blogimg111/StarDots-2026081714044302888.png", "caption": "" },
      { "url": "https://i.stardots.io/blogimg111/StarDots-2026081714045842798.png", "caption": "" }
    ],
    "date": "2026-08-17"
  },
  {
    "title": "测试3",
    "cover": "https://backup.fukit.cn/autoupload/f/e6dvVv6sI6US7bqgWvSMp9iO_OyvX7mIgxFBfDMDErs/20260710/cfDK/0X0/b78ee957723a5b97f86ef0318722e9ad.webp",
    "animationMode": "page-turn",
    "id": "album_1786946500435",
    "photos": [
      { "url": "https://i.stardots.io/blogimg111/StarDots-2026081714022807811.jpg", "caption": "" },
      { "url": "https://i.stardots.io/blogimg111/StarDots-2026081714022790304.jpg", "caption": "" },
      { "url": "https://i.stardots.io/blogimg111/StarDots-2026081714022764699.jpg", "caption": "" }
    ],
    "date": "2026-08-17"
  },
  {
    "title": "2233",
    "cover": "https://img.tofaka.com/autoupload/f/e3z5a/20260816/SHoC/1280X1722/illust_87528123_20260816_130655.jpg",
    "animationMode": "carousel-3d",
    "id": "album_1786895407291",
    "photos": [
      { "url": "https://img.tofaka.com/autoupload/f/e3z5a/20260816/v3xu/1908X1080/IMG_20260816_133600.jpg", "caption": "" },
      { "url": "https://tc.alcy.cc/tc/20260429/57f6f436e82bd7525d6a31bd8d710733.webp", "caption": "" },
      { "url": "https://bee-reg-ab.imagency.cn/p/8fac6f6069423edbbab0e4fd30909329.jpg", "caption": "" },
      { "url": "https://bee-reg-ab.imagency.cn/p/0735f84fd591c29519e26e595065aa0a.jpg", "caption": "" },
      { "url": "https://bee-reg-ab.imagency.cn/p/1a15e76a4e50389ed167451b8c96b039.png", "caption": "" },
      { "url": "https://bee-reg-ab.imagency.cn/p/4484af407454a3c972817709e1ad1624.jpg", "caption": "" }
    ],
    "date": "2026-08-16"
  }
];
