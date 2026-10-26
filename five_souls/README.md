# Five Souls — Pixel Art Dungeon RPG

Tarayıcıda çalışan, tek oyunculu veya aynı oda koduyla en fazla 5 oyunculu co-op zindan RPG'si.

## Kahramanlar
- **Doğukan — Warrior (kırmızı):** yüksek can ve güçlü yakın dövüş.
- **Yaren — Healer (sarı):** `Q` ile yakındaki takım arkadaşlarını iyileştirir.
- **Aysima — Archer (mor):** `Q` ile en yakındaki düşmana uzak menzilli ok atar.
- **Berken — Mage (pembe):** `Q` ile alan büyüsü yapar.
- **Emre — Fighter (yeşil):** `Q` ile yakın dövüş kombosu yapar.

## Beş bölüm
1. Fısıltı Mahzeni — balçıklar ve iskeletler.
2. Yarasa Yuvası — yarasalar, orklar ve iskeletler.
3. Unutulmuş Ruhlar — hayaletler ve güçlü orklar.
4. Kara Kale — elit orklar ve ruhlar.
5. Kadim Muhafız — iki koruyucu ve büyük boss savaşı.

Bölümdeki tüm canavarları yenince çıkış kapısına gidip `E` tuşuna basarak sonraki bölüme geç. Beşinci bölümde bossu yenerek oyunu tamamla. Sandıklar altın, can ve XP verir.

## Yerelde çalıştırma
Node.js 18+ kurulu olmalı.
```bash
npm install
npm start
```
Tarayıcıda `http://localhost:3000` aç.

## GitHub + Render
1. Bu klasörün **içindeki** dosyaları GitHub deposunun ana dizinine yükle (`package.json`, `server.js`, `public/`).
2. Render'da **New + → Web Service** ile GitHub deposunu bağla.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Root Directory boş bırak (dosyalar depo kökündeyse).
6. Deploy tamamlanınca Render URL'sini aç. Tek başına oynamak için varsayılan oda koduyla gir; arkadaşların aynı oda kodunu kullanmalı.

## Kontroller
- `WASD` veya ok tuşları: hareket
- `Space`: saldırı
- `Q`: sınıfa özel yetenek
- `E`: sandık/çıkış kapısıyla etkileşim
- Sağ panelden karakter seç, oda kodunu arkadaşlarınla paylaş.

Oyun durumu Socket.IO üzerinden oda bazında paylaşılır. Beş kişiden az oyuncuyla da oynanabilir.
