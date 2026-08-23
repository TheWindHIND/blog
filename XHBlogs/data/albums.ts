// 🛡️ 本文件由 XingHuiSama 控制台自动生成，请勿手动修改
export interface Photo { url: string; caption?: string; }

// 7 种模式（含无动画）
export type AnimationMode =
  | 'none'              // 无动画（默认网格展示）
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
    "title": "魔裁",
    "animationMode": "card-flip",
    "cover": "https://i.stardots.io/blogimg111/StarDots-2026082322322132905.png",
    "id": "album_1787495547309",
    "photos": [
      {
        "url": "https://i.stardots.io/blogimg111/StarDots-2026081714094666410.png",
        "caption": ""
      },
      {
        "url": "https://i.stardots.io/blogimg111/StarDots-2026081714101463097.png",
        "caption": ""
      },
      {
        "url": "https://i.stardots.io/blogimg111/StarDots-2026081714101489022.png",
        "caption": ""
      },
      {
        "url": "https://i.stardots.io/blogimg111/StarDots-2026081714101563208.png",
        "caption": ""
      },
      {
        "url": "https://i.stardots.io/blogimg111/StarDots-2026081714101802389.png",
        "caption": ""
      },
      {
        "url": "https://i.stardots.io/blogimg111/StarDots-2026082322472690019.png",
        "caption": ""
      },
      {
        "url": "https://i.stardots.io/blogimg111/StarDots-2026082322472480523.png",
        "caption": ""
      },
      {
        "url": "https://i.stardots.io/blogimg111/StarDots-2026082322471614471.png",
        "caption": ""
      },
      {
        "url": "https://i.stardots.io/blogimg111/StarDots-2026082322472070284.png",
        "caption": ""
      },
      {
        "url": "https://i.stardots.io/blogimg111/StarDots-2026082322472026049.png",
        "caption": ""
      }
    ],
    "date": "2026-08-23"
  },
  {
    "title": "星白",
    "animationMode": "slide-switch",
    "cover": "https://i.stardots.io/blogimg111/StarDots-2026082322115173913.png",
    "id": "album_1787494316206",
    "photos": [
      {
        "url": "https://i.stardots.io/blogimg111/StarDots-2026081714090646996.png",
        "caption": ""
      },
      {
        "url": "https://i.stardots.io/blogimg111/StarDots-2026081714085903703.jpg",
        "caption": ""
      },
      {
        "url": "https://i.stardots.io/blogimg111/StarDots-2026081714083582837.jpg",
        "caption": ""
      },
      {
        "url": "https://i.stardots.io/blogimg111/StarDots-2026081714075592135.jpg",
        "caption": ""
      },
      {
        "url": "https://i.stardots.io/blogimg111/StarDots-2026082322292728950.jpg",
        "caption": ""
      },
      {
        "url": "https://i.stardots.io/blogimg111/StarDots-2026082322292497048.png",
        "caption": ""
      },
      {
        "url": "https://i.stardots.io/blogimg111/StarDots-2026082322292455778.png",
        "caption": ""
      },
      {
        "url": "https://i.stardots.io/blogimg111/StarDots-2026082322292686593.png",
        "caption": ""
      },
      {
        "url": "https://i.stardots.io/blogimg111/StarDots-2026082322292788653.jpg",
        "caption": ""
      }
    ],
    "date": "2026-08-23"
  },
  {
    "title": "2233",
    "cover": "https://img.tofaka.com/autoupload/f/e3z5a/20260816/SHoC/1280X1722/illust_87528123_20260816_130655.jpg",
    "animationMode": "carousel-3d",
    "id": "album_1786895407291",
    "photos": [
      {
        "url": "https://img.tofaka.com/autoupload/f/e3z5a/20260816/v3xu/1908X1080/IMG_20260816_133600.jpg",
        "caption": ""
      },
      {
        "url": "https://tc.alcy.cc/tc/20260429/57f6f436e82bd7525d6a31bd8d710733.webp",
        "caption": ""
      },
      {
        "url": "https://bee-reg-ab.imagency.cn/p/8fac6f6069423edbbab0e4fd30909329.jpg",
        "caption": ""
      },
      {
        "url": "https://bee-reg-ab.imagency.cn/p/0735f84fd591c29519e26e595065aa0a.jpg",
        "caption": ""
      },
      {
        "url": "https://bee-reg-ab.imagency.cn/p/1a15e76a4e50389ed167451b8c96b039.png",
        "caption": ""
      },
      {
        "url": "https://bee-reg-ab.imagency.cn/p/4484af407454a3c972817709e1ad1624.jpg",
        "caption": ""
      }
    ],
    "date": "2026-08-16"
  }
];