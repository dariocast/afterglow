import os
import struct
import zlib
import math

os.makedirs('public/icons', exist_ok=True)
os.makedirs('public/screenshots', exist_ok=True)

class Canvas:
    def __init__(self, width, height, bg_color=(253, 252, 249)):
        self.width = width
        self.height = height
        self.line_len = 1 + width * 3
        self.buf = bytearray(self.line_len * height)
        # Fill background
        r, g, b = bg_color
        row_pattern = bytes([0] + [r, g, b] * width)
        for y in range(height):
            self.buf[y * self.line_len : (y + 1) * self.line_len] = row_pattern

    def fill_rect(self, x0, y0, w, h, color):
        x0 = max(0, min(self.width, x0))
        y0 = max(0, min(self.height, y0))
        x1 = max(0, min(self.width, x0 + w))
        y1 = max(0, min(self.height, y0 + h))
        if x0 >= x1 or y0 >= y1:
            return
        r, g, b = color
        line_slice = bytes([r, g, b] * (x1 - x0))
        for y in range(y0, y1):
            offset = y * self.line_len + 1 + x0 * 3
            self.buf[offset : offset + len(line_slice)] = line_slice

    def fill_rounded_rect(self, x0, y0, w, h, radius, color):
        self.fill_rect(x0 + radius, y0, w - 2 * radius, h, color)
        self.fill_rect(x0, y0 + radius, w, h - 2 * radius, color)
        # corners
        r_sq = radius * radius
        corners = [
            (x0 + radius, y0 + radius, x0, y0, radius, radius),
            (x0 + w - radius, y0 + radius, x0 + w - radius, y0, radius, radius),
            (x0 + radius, y0 + h - radius, x0, y0 + h - radius, radius, radius),
            (x0 + w - radius, y0 + h - radius, x0 + w - radius, y0 + h - radius, radius, radius),
        ]
        r, g, b = color
        for cx, cy, rx, ry, rw, rh in corners:
            for y in range(ry, ry + rh):
                for x in range(rx, rx + rw):
                    if (x - cx) ** 2 + (y - cy) ** 2 <= r_sq:
                        offset = y * self.line_len + 1 + x * 3
                        self.buf[offset] = r
                        self.buf[offset + 1] = g
                        self.buf[offset + 2] = b

    def draw_star(self, cx, cy, size, color):
        r, g, b = color
        # 4-point star / diamond sparkle geometric shape
        for y in range(max(0, cy - size), min(self.height, cy + size + 1)):
            dy = abs(y - cy) / size
            if dy > 1.0:
                continue
            # curve towards center
            span = int(size * ((1.0 - dy) ** 3))
            x0 = max(0, cx - span)
            x1 = min(self.width, cx + span + 1)
            for x in range(x0, x1):
                offset = y * self.line_len + 1 + x * 3
                self.buf[offset] = r
                self.buf[offset + 1] = g
                self.buf[offset + 2] = b

    def save(self, filepath):
        header = b'\x89PNG\r\n\x1a\n'
        ihdr_data = struct.pack('>IIBBBBB', self.width, self.height, 8, 2, 0, 0, 0)
        ihdr = struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + struct.pack('>I', zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff)
        idat_data = zlib.compress(self.buf, 6)
        idat = struct.pack('>I', len(idat_data)) + b'IDAT' + idat_data + struct.pack('>I', zlib.crc32(b'IDAT' + idat_data) & 0xffffffff)
        iend = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', zlib.crc32(b'IEND') & 0xffffffff)
        with open(filepath, 'wb') as f:
            f.write(header + ihdr + idat + iend)

# Colors
BG = (253, 252, 249)
DARK_BG = (17, 17, 16)
CARD_BG = (255, 255, 255)
CARD_BORDER = (235, 233, 226)
ACCENT = (194, 65, 12)
INK = (28, 25, 23)
MUTED = (140, 138, 134)
PILL_BG = (245, 243, 239)

def generate_icons():
    # 192 Standard
    c192 = Canvas(192, 192, bg_color=DARK_BG)
    c192.draw_star(96, 96, 68, ACCENT)
    c192.save('public/icons/icon-192.png')

    # 192 Maskable (safe zone is inner 80%, so size scaled down)
    c192m = Canvas(192, 192, bg_color=DARK_BG)
    c192m.draw_star(96, 96, 52, ACCENT)
    c192m.save('public/icons/icon-192-maskable.png')

    # 512 Standard
    c512 = Canvas(512, 512, bg_color=DARK_BG)
    c512.draw_star(256, 256, 180, ACCENT)
    c512.save('public/icons/icon-512.png')

    # 512 Maskable
    c512m = Canvas(512, 512, bg_color=DARK_BG)
    c512m.draw_star(256, 256, 140, ACCENT)
    c512m.save('public/icons/icon-512-maskable.png')

def generate_mobile_feed():
    c = Canvas(1080, 2340, bg_color=BG)
    # Status bar
    c.fill_rect(0, 0, 1080, 80, BG)
    # Header
    c.fill_rect(0, 80, 1080, 160, BG)
    c.fill_rect(0, 238, 1080, 2, CARD_BORDER)
    c.draw_star(120, 160, 36, ACCENT)
    c.fill_rect(180, 145, 280, 30, INK) # logo text
    c.fill_rounded_rect(900, 125, 100, 70, 35, INK) # profile avatar

    # Hero headline
    c.fill_rect(80, 320, 500, 50, INK)
    c.fill_rect(80, 390, 350, 45, ACCENT)
    c.fill_rect(80, 460, 680, 24, MUTED)

    # Filter pills
    filters = [(80, 180), (280, 140), (440, 160), (620, 170)]
    for idx, (fx, fw) in enumerate(filters):
        color = INK if idx == 0 else PILL_BG
        c.fill_rounded_rect(fx, 530, fw, 64, 32, color)

    # Post Cards
    card_y = 640
    posts = [
        (460, '22h remaining', ACCENT),
        (520, '4h remaining', (220, 38, 38)),
        (480, '18h remaining', ACCENT),
    ]
    for h, time_label, badge_color in posts:
        c.fill_rounded_rect(80, card_y, 920, h, 28, CARD_BG)
        # border
        c.fill_rect(80, card_y, 920, 2, CARD_BORDER)
        c.fill_rect(80, card_y + h - 2, 920, 2, CARD_BORDER)
        # avatar
        c.fill_rounded_rect(130, card_y + 40, 64, 64, 32, PILL_BG)
        # author name & expiry pill
        c.fill_rect(220, card_y + 55, 220, 26, INK)
        c.fill_rounded_rect(760, card_y + 45, 190, 44, 22, badge_color)
        # content lines
        c.fill_rect(130, card_y + 140, 800, 24, INK)
        c.fill_rect(130, card_y + 180, 720, 24, INK)
        c.fill_rect(130, card_y + 220, 540, 24, INK)
        # reaction pills
        c.fill_rounded_rect(130, card_y + h - 90, 120, 48, 24, PILL_BG)
        c.fill_rounded_rect(270, card_y + h - 90, 120, 48, 24, PILL_BG)
        c.fill_rounded_rect(410, card_y + h - 90, 120, 48, 24, PILL_BG)

        card_y += h + 40

    c.save('public/screenshots/narrow-1.png')

def generate_mobile_composer():
    c = Canvas(1080, 2340, bg_color=BG)
    # Header
    c.fill_rect(0, 80, 1080, 160, BG)
    c.draw_star(120, 160, 36, ACCENT)
    c.fill_rect(180, 145, 280, 30, INK)

    # Composer card (prominent)
    c.fill_rounded_rect(80, 300, 920, 900, 32, CARD_BG)
    c.fill_rect(80, 300, 920, 2, CARD_BORDER)
    c.fill_rect(80, 1198, 920, 2, CARD_BORDER)

    # Prompt label
    c.fill_rect(140, 360, 360, 32, INK)
    # Textarea mock
    c.fill_rounded_rect(140, 430, 800, 400, 16, PILL_BG)
    c.fill_rect(180, 480, 520, 28, INK)
    c.fill_rect(180, 530, 680, 28, INK)
    c.fill_rect(180, 580, 420, 28, INK)

    # Lifetime selection label
    c.fill_rect(140, 880, 280, 24, MUTED)
    # Pills: 6h, 12h, 24h, 3d, 7d
    pills = [(140, 130), (290, 130), (440, 150), (610, 130), (760, 130)]
    for idx, (px, pw) in enumerate(pills):
        color = ACCENT if idx == 2 else PILL_BG
        c.fill_rounded_rect(px, 930, pw, 60, 30, color)

    # Submit button
    c.fill_rounded_rect(140, 1040, 800, 88, 44, INK)

    # Lower preview feed
    c.fill_rounded_rect(80, 1260, 920, 400, 28, CARD_BG)
    c.fill_rounded_rect(130, 1310, 64, 64, 32, PILL_BG)
    c.fill_rect(220, 1325, 240, 26, INK)
    c.fill_rect(130, 1420, 760, 24, INK)
    c.fill_rect(130, 1460, 600, 24, INK)

    c.save('public/screenshots/narrow-2.png')

def generate_mobile_passkey():
    c = Canvas(1080, 2340, bg_color=DARK_BG)
    # Overlay background / modal
    c.fill_rounded_rect(80, 600, 920, 1140, 36, BG)

    # Modal Header
    c.draw_star(540, 740, 56, ACCENT)
    c.fill_rect(320, 840, 440, 44, INK)
    c.fill_rect(240, 910, 600, 24, MUTED)

    # Input field
    c.fill_rounded_rect(160, 1000, 760, 96, 20, PILL_BG)
    c.fill_rect(220, 1035, 320, 28, INK)

    # Primary Action (Passkey button)
    c.fill_rounded_rect(160, 1150, 760, 100, 50, INK)
    c.fill_rect(360, 1185, 360, 30, (255, 255, 255))

    # Biometric prompt sheet at bottom
    c.fill_rounded_rect(120, 1380, 840, 300, 28, CARD_BG)
    c.fill_rect(120, 1380, 840, 2, CARD_BORDER)
    c.fill_rounded_rect(500, 1410, 80, 10, 5, MUTED)
    # FaceID / Fingerprint icon placeholder
    c.fill_rounded_rect(500, 1460, 80, 80, 20, PILL_BG)
    c.draw_star(540, 1500, 24, ACCENT)
    c.fill_rect(340, 1570, 400, 26, INK)
    c.fill_rect(380, 1615, 320, 20, MUTED)

    c.save('public/screenshots/narrow-3.png')

def generate_desktop_wide():
    c = Canvas(1920, 1080, bg_color=BG)
    # Topbar
    c.fill_rect(0, 0, 1920, 72, BG)
    c.fill_rect(0, 71, 1920, 1, CARD_BORDER)
    c.draw_star(280, 36, 22, ACCENT)
    c.fill_rect(316, 26, 180, 22, INK)
    c.fill_rounded_rect(1560, 16, 80, 40, 20, PILL_BG) # theme toggle
    c.fill_rounded_rect(1660, 16, 120, 40, 20, INK) # sign in / user

    # Main shell (center column: 860px wide)
    shell_x = 530
    shell_w = 860

    # Intro hero
    c.fill_rect(shell_x, 130, 440, 42, INK)
    c.fill_rect(shell_x, 185, 300, 38, ACCENT)
    c.fill_rect(shell_x, 240, 620, 18, MUTED)

    # Composer card
    c.fill_rounded_rect(shell_x, 290, shell_w, 240, 18, CARD_BG)
    c.fill_rect(shell_x, 290, shell_w, 1, CARD_BORDER)
    c.fill_rect(shell_x, 529, shell_w, 1, CARD_BORDER)
    c.fill_rounded_rect(shell_x + 30, 320, shell_w - 60, 100, 10, PILL_BG)
    c.fill_rect(shell_x + 50, 345, 420, 20, INK)
    # Lifetime selector
    pills = [(shell_x + 30, 70), (shell_x + 110, 70), (shell_x + 190, 80), (shell_x + 280, 70)]
    for idx, (px, pw) in enumerate(pills):
        color = ACCENT if idx == 2 else PILL_BG
        c.fill_rounded_rect(px, 445, pw, 36, 18, color)
    c.fill_rounded_rect(shell_x + shell_w - 180, 440, 150, 46, 23, INK)

    # Feed header + filter pills
    c.fill_rect(shell_x, 575, 240, 24, INK)
    c.fill_rounded_rect(shell_x + shell_w - 280, 565, 80, 36, 18, INK)
    c.fill_rounded_rect(shell_x + shell_w - 190, 565, 80, 36, 18, PILL_BG)
    c.fill_rounded_rect(shell_x + shell_w - 100, 565, 100, 36, 18, PILL_BG)

    # Feed Cards
    feed_y = 625
    for h, label_color in [(220, ACCENT), (200, MUTED)]:
        c.fill_rounded_rect(shell_x, feed_y, shell_w, h, 18, CARD_BG)
        c.fill_rect(shell_x, feed_y, shell_w, 1, CARD_BORDER)
        c.fill_rect(shell_x, feed_y + h - 1, shell_w, 1, CARD_BORDER)
        c.fill_rounded_rect(shell_x + 30, feed_y + 25, 42, 42, 21, PILL_BG)
        c.fill_rect(shell_x + 85, feed_y + 35, 180, 18, INK)
        c.fill_rounded_rect(shell_x + shell_w - 160, feed_y + 25, 130, 30, 15, label_color)
        c.fill_rect(shell_x + 30, feed_y + 90, 680, 18, INK)
        c.fill_rect(shell_x + 30, feed_y + 120, 520, 18, INK)
        feed_y += h + 25

    c.save('public/screenshots/wide-1.png')

if __name__ == '__main__':
    print('Generating icons...')
    generate_icons()
    print('Generating screenshots...')
    generate_mobile_feed()
    generate_mobile_composer()
    generate_mobile_passkey()
    generate_desktop_wide()
    print('All PWA assets generated successfully.')
