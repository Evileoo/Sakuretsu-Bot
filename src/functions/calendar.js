import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';

// Calendar image of the mission board: the next 7 days, generated from the events (in-game time, UTC)

const DAY = 24 * 60 * 60 * 1000;
const DAY_NAMES = [`Sunday`, `Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`, `Saturday`];
const logosDir = path.join(path.dirname(fileURLToPath(import.meta.url)), `..`, `..`, `data`, `logos`);
const FONT = [`Segoe UI`, `Arial`, `DejaVu Sans`, `Liberation Sans`].find(font => GlobalFonts.has(font)) ?? `sans-serif`;

export const COLORS = {
    blue:   { light: `#79abe8`, main: `#568bd3`, dark: `#3b68a8`, edge: `#b8d8fb` },
    green:  { light: `#86c987`, main: `#62aa66`, dark: `#45864a`, edge: `#c2ebbd` },
    purple: { light: `#cf93e8`, main: `#b06fcf`, dark: `#8a4fab`, edge: `#ebc4f7` },
    red:    { light: `#e78484`, main: `#cf5d5d`, dark: `#a63f3f`, edge: `#f6c0c0` },
    orange: { light: `#efb36f`, main: `#de9244`, dark: `#b5702a`, edge: `#f8d9b3` },
    teal:   { light: `#6fcbc4`, main: `#45aaa3`, dark: `#2f8079`, edge: `#b5ebe6` }
};

// ---------------------------------------------------------------- dates

// Add an event frequency ("Y M D H M S", "*" when it doesn't change) to a date, in UTC
function addFrequency(date, frequency) {
    const parse = (v) => (v == undefined || v == `*` ? null : Number(v));
    const [year, month, day, hour, minute, second] = frequency.trim().split(/\s+/).map(parse);

    const next = new Date(date.getTime());
    if (year != null) next.setUTCFullYear(next.getUTCFullYear() + year);
    if (month != null) next.setUTCMonth(next.getUTCMonth() + month);
    if (day != null) next.setUTCDate(next.getUTCDate() + day);
    if (hour != null) next.setUTCHours(next.getUTCHours() + hour);
    if (minute != null) next.setUTCMinutes(next.getUTCMinutes() + minute);
    if (second != null) next.setUTCSeconds(next.getUTCSeconds() + second);
    return next;
}

// Occurrences of an event between two dates. event: { start, end (or null), frequency (or null) }
function occurrences(event, from, to) {
    const list = [];
    let start = event.start;
    let end = event.end ?? event.start;

    for (let i = 0; i < 100 && start < to; i++) {
        if (end >= from) list.push({ start, end });
        if (!event.frequency) break;

        const nextStart = addFrequency(start, event.frequency);
        if (nextStart <= start) break; // invalid frequency
        end = addFrequency(end, event.frequency);
        start = nextStart;
    }
    return list;
}

// ---------------------------------------------------------------- logos

// File name of the logo of an event (shared by all the events with the same name)
function logoFile(name) {
    const key = name.toLowerCase().normalize(`NFD`).replace(/[^a-z0-9]+/g, `-`).replace(/^-|-$/g, ``) || `event`;
    return path.join(logosDir, `${key}.png`);
}

// Download an image and save it as the logo of an event (96x96 png)
async function saveLogo(name, url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`download failed (${response.status})`);
    const image = await loadImage(Buffer.from(await response.arrayBuffer()));

    const size = 96;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext(`2d`);
    const scale = Math.min(size / image.width, size / image.height);
    const w = image.width * scale, h = image.height * scale;
    ctx.drawImage(image, (size - w) / 2, (size - h) / 2, w, h);

    fs.mkdirSync(logosDir, { recursive: true });
    fs.writeFileSync(logoFile(name), await canvas.encode(`png`));
}

function removeLogo(name) {
    if (fs.existsSync(logoFile(name))) fs.unlinkSync(logoFile(name));
}

function hasLogo(name) {
    return fs.existsSync(logoFile(name));
}

// ---------------------------------------------------------------- layout

// Default color: red for the Blood Clash, otherwise always the same color for the same name
function defaultColor(event) {
    if (event.parent === `Blood Clash`) return `red`;
    const palette = [`blue`, `green`, `purple`];
    const hash = [...event.name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    return palette[hash % palette.length];
}

// Bars of the 7 days window starting at the UTC day of "now", placed on lines
function layout(events, now = new Date()) {
    const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const windowEnd = new Date(windowStart.getTime() + 7 * DAY);

    const bars = [];
    for (const event of events) {
        for (const occurrence of occurrences(event, windowStart, windowEnd)) {
            const startDay = Math.floor((occurrence.start - windowStart) / DAY);
            // An event ending at 00:00 doesn't take the next day
            const endDay = Math.floor((Math.max(occurrence.end.getTime() - 1, occurrence.start.getTime()) - windowStart) / DAY);
            if (endDay < 0 || startDay > 6) continue;

            bars.push({
                name: event.name,
                color: COLORS[event.color] ? event.color : defaultColor(event),
                from: Math.max(0, startDay),
                to: Math.min(6, endDay),
                cutLeft: startDay < 0,
                cutRight: endDay > 6
            });
        }
    }

    // Lines: the first line where the bar fits, longest bars first when they start the same day
    bars.sort((a, b) => a.from - b.from || (b.to - b.from) - (a.to - a.from) || a.name.localeCompare(b.name));
    const lines = [];
    for (const bar of bars) {
        let line = lines.findIndex(lastDay => lastDay < bar.from);
        if (line === -1) { line = lines.length; lines.push(-1); }
        lines[line] = bar.to;
        bar.line = line;
    }

    return { windowStart, bars, lines: lines.length };
}

// ---------------------------------------------------------------- drawing

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// Waves pattern of the background
function waves(ctx, x, y, w, h, color) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    const r = 14;
    for (let row = 0; row * r * 0.5 < h + r; row++) {
        for (let col = -1; col * r * 2 < w + r * 2; col++) {
            const cx = x + col * r * 2 + (row % 2 ? r : 0);
            const cy = y + row * r * 0.5;
            for (const radius of [r, r * 0.66, r * 0.33]) {
                ctx.beginPath();
                ctx.arc(cx, cy, radius, Math.PI, 2 * Math.PI);
                ctx.stroke();
            }
        }
    }
    ctx.restore();
}

function bar(ctx, x0, x1, y, h, color, cutLeft, cutRight) {
    const arrow = cutRight ? 0 : 16;
    const r = 5;
    const shape = () => {
        ctx.beginPath();
        if (cutLeft) ctx.moveTo(x0, y);
        else { ctx.moveTo(x0 + r, y); }
        ctx.lineTo(x1 - arrow, y);
        if (cutRight) { ctx.lineTo(x1, y); ctx.lineTo(x1, y + h); }
        else { ctx.lineTo(x1, y + h / 2); ctx.lineTo(x1 - arrow, y + h); }
        if (cutLeft) { ctx.lineTo(x0, y + h); ctx.lineTo(x0, y); }
        else { ctx.lineTo(x0 + r, y + h); ctx.arcTo(x0, y + h, x0, y, r); ctx.arcTo(x0, y, x0 + r, y, r); }
        ctx.closePath();
    };

    // shadow
    ctx.save();
    ctx.translate(0, 3);
    shape();
    ctx.fillStyle = `rgba(60, 40, 20, 0.18)`;
    ctx.fill();
    ctx.restore();

    shape();
    const gradient = ctx.createLinearGradient(0, y, 0, y + h);
    gradient.addColorStop(0, color.light);
    gradient.addColorStop(0.55, color.main);
    gradient.addColorStop(1, color.dark);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // light line on the top, and double chevron at the end like in game
    ctx.strokeStyle = `rgba(255, 255, 255, 0.35)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0 + (cutLeft ? 0 : r), y + 2.5);
    ctx.lineTo(x1 - arrow - 2, y + 2.5);
    ctx.stroke();
    if (!cutRight) {
        ctx.strokeStyle = color.edge;
        ctx.lineWidth = 2.5;
        for (const offset of [6, 12]) {
            ctx.beginPath();
            ctx.moveTo(x1 - arrow - offset + 2, y + 3);
            ctx.lineTo(x1 - offset + 2, y + h / 2);
            ctx.lineTo(x1 - arrow - offset + 2, y + h - 3);
            ctx.stroke();
        }
    }
}

function fitText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let cut = text;
    while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
    return `${cut.trimEnd()}…`;
}

// events: [{ name, parent, start: Date, end: Date or null, frequency, color }] -> PNG buffer
async function render(events, now = new Date()) {
    const { windowStart, bars, lines } = layout(events, now);

    const W = 1000, rollerW = 32, headerH = 80, lineH = 58, barH = 44;
    const paperX = rollerW + 8, paperW = W - 2 * paperX, colW = paperW / 7;
    const paperY = headerH + 10, paperH = Math.max(lines, 4) * lineH + 26;
    const H = paperY + paperH + 16;

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext(`2d`);

    // Background
    const background = ctx.createLinearGradient(0, 0, 0, H);
    background.addColorStop(0, `#30355a`);
    background.addColorStop(1, `#1f2340`);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, W, H);
    waves(ctx, 0, 0, W, H, `rgba(255, 255, 255, 0.045)`);

    // Days
    const today = Math.floor((now - windowStart) / DAY);
    ctx.textAlign = `center`;
    for (let i = 0; i < 7; i++) {
        const date = new Date(windowStart.getTime() + i * DAY);
        const x = paperX + colW * (i + 0.5);
        ctx.fillStyle = i === today ? `#ffd84a` : `#ffffff`;
        ctx.shadowColor = `rgba(0, 0, 0, 0.5)`;
        ctx.shadowBlur = 3;
        ctx.font = `bold 21px "${FONT}"`;
        ctx.fillText(DAY_NAMES[date.getUTCDay()], x, 32);
        ctx.font = `bold 20px "${FONT}"`;
        ctx.fillText(`${date.getUTCMonth() + 1}-${date.getUTCDate()}`, x, 60);
    }
    ctx.shadowBlur = 0;
    ctx.shadowColor = `transparent`;

    // Paper
    roundRect(ctx, paperX, paperY, paperW, paperH, 6);
    const paper = ctx.createLinearGradient(0, paperY, 0, paperY + paperH);
    paper.addColorStop(0, `#f1e4d2`);
    paper.addColorStop(1, `#e5d0b6`);
    ctx.fillStyle = paper;
    ctx.fill();
    for (const y of [paperY, paperY + paperH - 9]) {
        ctx.fillStyle = `#28525a`;
        ctx.fillRect(paperX, y, paperW, 9);
        waves(ctx, paperX, y, paperW, 9, `rgba(255, 255, 255, 0.12)`);
    }

    // Today column and day separators
    ctx.fillStyle = `rgba(255, 216, 74, 0.13)`;
    if (today >= 0 && today < 7) ctx.fillRect(paperX + colW * today, paperY + 9, colW, paperH - 18);
    ctx.strokeStyle = `rgba(110, 80, 50, 0.10)`;
    ctx.lineWidth = 1;
    for (let i = 1; i < 7; i++) {
        ctx.beginPath();
        ctx.moveTo(paperX + colW * i, paperY + 12);
        ctx.lineTo(paperX + colW * i, paperY + paperH - 12);
        ctx.stroke();
    }

    // Events
    ctx.save();
    ctx.beginPath();
    ctx.rect(paperX, paperY + 9, paperW, paperH - 18);
    ctx.clip();

    for (const b of bars) {
        const x0 = b.cutLeft ? paperX - 2 : paperX + b.from * colW + 5;
        const x1 = b.cutRight ? paperX + paperW + 2 : paperX + (b.to + 1) * colW - 5;
        const y = paperY + 13 + b.line * lineH + (lineH - barH) / 2;
        bar(ctx, x0, x1, y, barH, COLORS[b.color], b.cutLeft, b.cutRight);

        // Logo and name, centered in the visible part of the bar
        const left = Math.max(x0, paperX) + 10, right = Math.min(x1, paperX + paperW) - (b.cutRight ? 10 : 26);
        const logo = hasLogo(b.name) ? await loadImage(fs.readFileSync(logoFile(b.name))).catch(() => null) : null;
        const logoSize = 36, gap = 8;
        const space = right - left - (logo ? logoSize + gap : 0);

        // Smaller text in the short bars before cutting the name
        let fontSize = 19;
        ctx.font = `bold ${fontSize}px "${FONT}"`;
        while (fontSize > 14 && ctx.measureText(b.name).width > space) {
            fontSize--;
            ctx.font = `bold ${fontSize}px "${FONT}"`;
        }
        const text = fitText(ctx, b.name, space);
        const textWidth = ctx.measureText(text).width;
        const total = textWidth + (logo ? logoSize + gap : 0);
        let x = left + Math.max(0, (right - left - total) / 2);

        if (logo) {
            ctx.drawImage(logo, x, y + (barH - logoSize) / 2, logoSize, logoSize);
            x += logoSize + gap;
        }

        ctx.textAlign = `left`;
        ctx.textBaseline = `middle`;
        ctx.lineJoin = `round`;
        ctx.lineWidth = 4;
        ctx.strokeStyle = `rgba(40, 28, 18, 0.75)`;
        ctx.strokeText(text, x, y + barH / 2 + 1);
        ctx.fillStyle = `#ffffff`;
        ctx.fillText(text, x, y + barH / 2 + 1);
        ctx.textBaseline = `alphabetic`;
    }
    ctx.restore();

    if (bars.length === 0) {
        ctx.textAlign = `center`;
        ctx.font = `bold 22px "${FONT}"`;
        ctx.fillStyle = `#8a6a4a`;
        ctx.fillText(`No event in the next 7 days`, W / 2, paperY + paperH / 2 + 8);
    }

    // Rollers
    for (const x of [8, W - 8 - rollerW]) {
        const roller = ctx.createLinearGradient(x, 0, x + rollerW, 0);
        roller.addColorStop(0, `#173f44`);
        roller.addColorStop(0.45, `#2f6d73`);
        roller.addColorStop(1, `#173f44`);
        ctx.fillStyle = roller;
        ctx.fillRect(x, paperY - 12, rollerW, paperH + 24);
        ctx.fillStyle = `#7a2424`;
        ctx.fillRect(x - 3, paperY - 18, rollerW + 6, 8);
        ctx.fillRect(x - 3, paperY + paperH + 10, rollerW + 6, 8);
    }

    return await canvas.encode(`png`);
}

export const calendar = { render, layout, occurrences, addFrequency, saveLogo, removeLogo, hasLogo, COLORS };
