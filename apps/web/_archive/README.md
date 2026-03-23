# FlexMatches — Code Archive

Bu klasör, büyük refactoring öncesi sayfaların yedeklerini içerir.
İleride geri dönmek veya belirli bir özelliği kurtarmak için kullanılabilir.

## 2026-03-21
Arşivleme sebebi: Stratejik product review sonrası Home sadeleştirme,
Discover kart redesign, Joint check-in eklenmesi öncesi backup.

**Arşivlenen dosyalar:**
- `home_page.tsx` — Tam featured dashboard (Quick Actions, Quote of Day, Goals, Events, Community grid, Analytics vb.)
- `discover_page.tsx` — Match score %, avatar sistemi, harita, full filter panel
- `activity_page.tsx` — Body measurements, haftalık bar chart, leaderboard, stats
- `profile_page.tsx` — Avatar picker, badge sistemi, tier card, privacy settings

**Öne çıkan özellikler (gelecekte geri alınabilir):**
- Quote of the Day kartı
- Haftalık bar chart (pure CSS)
- Quick Actions horizontal scroll (Log Workout, Analytics, Track Weight)
- Home'daki 2x2 Community grid
- Body measurements tracking formu
- Activity sayfasındaki kalori auto-calc (16 egzersiz tipi)
