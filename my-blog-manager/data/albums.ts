// 🛡️ 本文件由 XingHuiSama 控制台自动生成，请勿手动修改
export type AnimationMode = 'spatial-rift' | 'magic-cube' | 'liquid-glass' | 'infinite-depth' | 'domino-wave';
export interface Photo { url: string; caption?: string; }
export interface Album { id: string; title: string; description: string; cover: string; date: string; photos: Photo[]; animationMode?: AnimationMode; }

export const albums: Album[] = [
  {
    "title": "2233",
    "cover": "https://img.tofaka.com/autoupload/f/e3z5a/20260816/SHoC/1280X1722/illust_87528123_20260816_130655.jpg",
    "animationMode": "infinite-depth",
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