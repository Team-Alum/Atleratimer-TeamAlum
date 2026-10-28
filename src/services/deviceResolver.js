// Device Name & Mobile Model Resolution Engine
// Accurately maps User-Agents, Client Hints, and Screen Dimensions to specific device models
// e.g. "iPhone 15 Pro", "Samsung Galaxy S24 Ultra", "Google Pixel 8", "OnePlus 11"

export function resolveIPhoneModel(w = 0, h = 0, dpr = 1) {
  const max = Math.max(w, h);
  const min = Math.min(w, h);

  // Modern Dynamic Island / Pro Max models
  if (max === 932 && min === 430) return 'iPhone 15 Pro Max / 14 Pro Max';
  if (max === 852 && min === 393) return 'iPhone 15 Pro / 15 / 14 Pro';
  if (max === 926 && min === 428) return 'iPhone 14 Plus / 13 Pro Max';
  if (max === 844 && min === 390) return 'iPhone 14 / 13 / 12';
  if (max === 812 && min === 375 && dpr >= 3) return 'iPhone 13 mini / 12 mini';
  if (max === 896 && min === 414 && dpr >= 3) return 'iPhone 11 Pro Max / XS Max';
  if (max === 896 && min === 414 && dpr < 3) return 'iPhone 11 / XR';
  if (max === 667 && min === 375) return 'iPhone SE / 8';
  if (max === 736 && min === 414) return 'iPhone 8 Plus / 7 Plus';

  return 'Apple iPhone';
}

export function resolveIPadModel(w = 0, h = 0) {
  const max = Math.max(w, h);
  const min = Math.min(w, h);

  if (max === 1366 && min === 1024) return 'iPad Pro 12.9"';
  if (max === 1194 && min === 834) return 'iPad Pro 11"';
  if (max === 1180 && min === 820) return 'iPad Air';
  if (max === 1133 && min === 744) return 'iPad mini';

  return 'Apple iPad';
}

export function formatAndroidModel(raw = '') {
  let m = String(raw || '').trim().replace(/^Linux;\s*/i, '');

  // Samsung Galaxy S-Series
  if (/^SM-S928/i.test(m)) return 'Samsung Galaxy S24 Ultra';
  if (/^SM-S926/i.test(m)) return 'Samsung Galaxy S24+';
  if (/^SM-S921/i.test(m)) return 'Samsung Galaxy S24';
  if (/^SM-S918/i.test(m)) return 'Samsung Galaxy S23 Ultra';
  if (/^SM-S916/i.test(m)) return 'Samsung Galaxy S23+';
  if (/^SM-S911/i.test(m)) return 'Samsung Galaxy S23';
  if (/^SM-S908/i.test(m)) return 'Samsung Galaxy S22 Ultra';
  if (/^SM-S906/i.test(m)) return 'Samsung Galaxy S22+';
  if (/^SM-S901/i.test(m)) return 'Samsung Galaxy S22';
  if (/^SM-G998/i.test(m)) return 'Samsung Galaxy S21 Ultra';
  if (/^SM-G996/i.test(m)) return 'Samsung Galaxy S21+';
  if (/^SM-G991/i.test(m)) return 'Samsung Galaxy S21';
  if (/^SM-G98/i.test(m)) return 'Samsung Galaxy S20';
  if (/^SM-G97/i.test(m)) return 'Samsung Galaxy S10';

  // Samsung Galaxy A, M, Z Fold / Flip Series
  if (/^SM-A546/i.test(m)) return 'Samsung Galaxy A54 5G';
  if (/^SM-A536/i.test(m)) return 'Samsung Galaxy A53 5G';
  if (/^SM-A346/i.test(m)) return 'Samsung Galaxy A34 5G';
  if (/^SM-A146/i.test(m)) return 'Samsung Galaxy A14 5G';
  if (/^SM-A\d{3}/i.test(m)) return `Samsung Galaxy A-Series (${m})`;
  if (/^SM-M\d{3}/i.test(m)) return `Samsung Galaxy M-Series (${m})`;
  if (/^SM-F9/i.test(m)) return 'Samsung Galaxy Z Fold';
  if (/^SM-F7/i.test(m)) return 'Samsung Galaxy Z Flip';
  if (/^SM-/i.test(m)) return `Samsung (${m})`;

  // Google Pixel Series
  if (/Pixel 8 Pro/i.test(m)) return 'Google Pixel 8 Pro';
  if (/Pixel 8a/i.test(m)) return 'Google Pixel 8a';
  if (/Pixel 8/i.test(m)) return 'Google Pixel 8';
  if (/Pixel 7 Pro/i.test(m)) return 'Google Pixel 7 Pro';
  if (/Pixel 7a/i.test(m)) return 'Google Pixel 7a';
  if (/Pixel 7/i.test(m)) return 'Google Pixel 7';
  if (/Pixel 6 Pro/i.test(m)) return 'Google Pixel 6 Pro';
  if (/Pixel 6a/i.test(m)) return 'Google Pixel 6a';
  if (/Pixel 6/i.test(m)) return 'Google Pixel 6';
  if (/Pixel 5/i.test(m)) return 'Google Pixel 5';
  if (/Pixel 4/i.test(m)) return 'Google Pixel 4';
  if (/Pixel/i.test(m)) return `Google ${m}`;

  // OnePlus
  if (/OnePlus|ONEPLUS/i.test(m)) return m.replace(/ONEPLUS\s*/i, 'OnePlus ');
  if (/^CPH2451|^CPH2449/i.test(m)) return 'OnePlus 11';
  if (/^CPH2413/i.test(m)) return 'OnePlus 11R';
  if (/^NE2213|^NE2215/i.test(m)) return 'OnePlus 10 Pro';
  if (/^IN2023|^IN2025/i.test(m)) return 'OnePlus 8 Pro';

  // Xiaomi, Redmi & POCO
  if (/Redmi Note \d+/i.test(m)) return m;
  if (/Redmi/i.test(m)) return m;
  if (/POCO/i.test(m)) return m;
  if (/2312|2304|2210|2201/i.test(m)) return `Xiaomi (${m})`;

  // Motorola
  if (/moto\s/i.test(m)) return `Motorola ${m}`;
  if (/^XT\d{4}/i.test(m)) return `Motorola (${m})`;

  // Realme, OPPO & Vivo
  if (/^RMX/i.test(m)) return `Realme (${m})`;
  if (/^CPH/i.test(m)) return `OPPO (${m})`;
  if (/^V\d{4}/i.test(m)) return `Vivo (${m})`;

  return m.slice(0, 36);
}

export function parseDeviceName(ua = '', clientModel = '', screenW = 0, screenH = 0, dpr = 1) {
  // If client hints provided an explicit model (e.g., from navigator.userAgentData)
  if (clientModel && typeof clientModel === 'string' && clientModel.trim()) {
    const cm = clientModel.trim();
    if (cm !== 'K' && cm !== 'Mobile' && cm.length > 1) {
      return formatAndroidModel(cm);
    }
  }

  const str = String(ua || '');

  // 1. Apple iOS Devices
  if (/iPhone/i.test(str)) {
    return resolveIPhoneModel(screenW, screenH, dpr);
  }
  if (/iPad/i.test(str)) {
    return resolveIPadModel(screenW, screenH);
  }
  if (/iPod/i.test(str)) {
    return 'Apple iPod Touch';
  }

  // 2. Android Devices (User Agent parsing)
  if (/Android/i.test(str)) {
    // Matches: Linux; Android 14; <MODEL> Build/... or Linux; Android 14; <MODEL>)
    const match = str.match(/;\s*(?:Android\s+[\d.]+;\s*)?([^;)]+?)(?:\s+Build|\s*\))/i);
    if (match && match[1]) {
      const rawModel = match[1].trim();
      if (rawModel && !rawModel.startsWith('K') && !/wv|Version\//i.test(rawModel)) {
        return formatAndroidModel(rawModel);
      }
    }
    return 'Android Device';
  }

  // 3. Desktop / Other platforms
  if (/Macintosh|Mac OS X/i.test(str)) {
    return 'MacBook / Mac';
  }
  if (/Windows NT/i.test(str)) {
    return 'Windows PC';
  }
  if (/CrOS/i.test(str)) {
    return 'Chromebook';
  }
  if (/Linux/i.test(str)) {
    return 'Linux PC';
  }

  return 'Desktop';
}
