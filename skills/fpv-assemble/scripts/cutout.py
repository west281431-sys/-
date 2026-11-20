# Объектіні (кеме, көлік, ғимарат) фоннан бөледі: ФОТО -> ФОТО_obj.png (мөлдір фонда) + ФОТО_bg.jpg (объектісіз фон)
# python3 -I scripts/cutout.py media/photos/a.jpg media/photos/b.jpg ...
# Бірінші іске қосқанда rembg моделін (~180 МБ) жүктейді: pip install rembg onnxruntime
import sys, os, cv2, numpy as np
from rembg import remove, new_session
ses = new_session('isnet-general-use')
for arg in sys.argv[1:]:
    # ФАЙЛ:0 — көкжиек жоқ (үстінен түсірілген кадр), ФАЙЛ:0.32 — көкжиек биіктігі (0..1) қолмен
    f, _, hzarg = arg.partition(':')
    a = cv2.imread(f); h, w = a.shape[:2]
    o = np.array(remove(cv2.cvtColor(a, cv2.COLOR_BGR2RGB), session=ses))
    al = o[:, :, 3]
    al = cv2.GaussianBlur(al, (0, 0), 1.2)
    base = os.path.splitext(f)[0]
    cv2.imwrite(base + '_obj.png', np.dstack([a, al]))
    # фон: объектінің орнын сол қатардағы көрші теңіз/аспан пикселдерімен толтырамыз (теңіз көлденең біркелкі)
    m = (al > 10).astype(np.uint8)
    m = cv2.dilate(m, np.ones((31, 31), np.uint8)).astype(bool)
    bg = a.copy()
    for y in range(h):
        row = m[y]
        if not row.any(): continue
        if row.all():
            continue
        xs = np.flatnonzero(np.diff(np.r_[0, row.astype(np.int8), 0]))
        for x0, x1 in zip(xs[::2], xs[1::2]):
            n = x1 - x0
            if x0 >= n: src = a[y, x0 - n:x0][::-1]            # сол жақтағы бөлікті айна етіп
            elif w - x1 >= n: src = a[y, x1:x1 + n][::-1]       # оң жақтағыны
            else:
                ok = a[y, ~row]; src = ok[np.arange(n) % len(ok)]
            # түс: екі шеттің арасындағы біркелкі өтпе; текстура: көршіден тек ұсақ толқындар (күн, кеме қайталанбасын)
            L = a[y, max(0, x0 - 6):x0].reshape(-1, 3).mean(0) if x0 > 0 else a[y, x1:x1 + 6].reshape(-1, 3).mean(0)
            R = a[y, x1:min(w, x1 + 6)].reshape(-1, 3).mean(0) if x1 < w else L
            ramp = np.linspace(0, 1, n)[:, None]
            base_c = L * (1 - ramp) + R * ramp
            sf = src.astype(np.float32)
            det = sf - cv2.GaussianBlur(sf.reshape(1, n, 3), (0, 0), 6).reshape(n, 3)
            bg[y, x0:x1] = np.clip(base_c + det * 0.9, 0, 255).astype(np.uint8)
    full = m.all(axis=1)
    if full.any():  # толық жабылған қатарлар — inpaint
        mm = np.zeros((h, w), np.uint8); mm[full] = 255
        bg = cv2.inpaint(bg, mm, 9, cv2.INPAINT_TELEA)
    # тігістерді жұмсарту
    soft = cv2.GaussianBlur(bg, (0, 0), 3)
    mf = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 8)[:, :, None]
    edge = np.clip(mf * (1 - mf) * 4, 0, 1)
    bg = (bg * (1 - edge) + soft * edge).astype(np.uint8)
    # теңіз: көкжиектен төмен — объектісіз таза су жолағын айна етіп қайталап, бүкіл ені бойынша жаңа су жасаймын
    ys, xs = np.where(al > 60)
    bx0, bx1 = xs.min(), xs.max()
    rowm = np.array([a[y, ~m[y]].reshape(-1, 3).mean(0) if (~m[y]).any() else a[y].reshape(-1, 3).mean(0) for y in range(h)], np.float32)
    lum = rowm.mean(1); grad = np.abs(np.diff(cv2.GaussianBlur(lum.reshape(-1, 1), (1, 9), 0).ravel()))
    lo, hi = int(h * .05), int(h * .65)
    hz = lo + int(np.argmax(grad[lo:hi])) if grad[lo:hi].max() > 3 else 0
    if hz < h * .1 or hz > h * .6: hz = 0
    if hzarg: hz = int(float(hzarg) * h)
    L = max(0, bx0 - 25); Rw = max(0, w - (bx1 + 25))
    strip = a[hz:, :L] if L >= Rw else a[hz:, bx1 + 25:]
    if strip.shape[1] >= 40:
        # көбік қатарларын (ақ, қанықпаған) көрші таза қатарлармен ауыстыру
        hsv = cv2.cvtColor(strip, cv2.COLOR_BGR2HSV)
        fo = ((hsv[:, :, 2] > 175) & (hsv[:, :, 1] < 90)).mean(1) > 0.04
        fo = cv2.dilate(fo.astype(np.uint8).reshape(-1, 1), np.ones((9, 1), np.uint8)).ravel().astype(bool)
        if fo.any() and (~fo).any():
            strip = strip.copy(); H2 = strip.shape[0]
            ed = np.flatnonzero(np.diff(np.r_[0, fo.astype(np.int8), 0]))
            for y0, y1 in zip(ed[::2], ed[1::2]):     # көбік бөлігін тұтас таза бөлікпен (үстінен не астынан) ауыстыру
                n = y1 - y0
                for src0 in (y0 - n, y1, y0 - 2 * n, y1 + n):
                    if 0 <= src0 and src0 + n <= H2 and not fo[src0:src0 + n].any():
                        strip[y0:y1] = strip[src0:src0 + n]; break
                else:
                    strip[y0:y1] = cv2.resize(strip[max(0, y0 - 2):y0 + 1] if y0 > 0 else strip[y1:y1 + 2], (strip.shape[1], n))
        tiles = []; tot = 0; flip = False
        while tot < w:
            tiles.append(strip[:, ::-1] if flip else strip); tot += strip.shape[1]; flip = not flip
        water = np.hstack(tiles)[:, :w]
        bg[hz:] = water
        if hz > 0:  # көкжиек тігісін жұмсарту
            y0, y1 = max(0, hz - 6), min(h, hz + 6)
            bg[y0:y1] = cv2.GaussianBlur(bg[max(0, y0 - 10):min(h, y1 + 10)], (0, 0), 3)[y0 - max(0, y0 - 10):y0 - max(0, y0 - 10) + (y1 - y0)]
    cv2.imwrite(base + '_bg.jpg', bg, [cv2.IMWRITE_JPEG_QUALITY, 92])
    ys, xs = np.where(al > 128)
    print(os.path.basename(f), 'bbox x %.2f-%.2f y %.2f-%.2f' % (xs.min() / w, xs.max() / w, ys.min() / h, ys.max() / h))
