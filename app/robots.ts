import type { MetadataRoute } from "next";

// 검색엔진이 이 사이트의 어떤 주소도 수집하지 않게 알린다. (내부 자료로 간주하는 도구)
// 접속을 막는 장치는 아니고, 검색 결과에 나오지 않게 하는 안내이다.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
