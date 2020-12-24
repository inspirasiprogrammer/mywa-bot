## Getting Started

This project require NodeJS v12.

### Install

Clone this project

```bash
> git clone https://github.com/inspirasiprogrammer/mywa-bot.git
> cd mywa-bot
```

Install the dependencies:

```bash
> npm install
> npm install gify-cli -g
```

### Usage

Run the Whatsapp bot

```bash
> npm start
```

after running it you need to scan the qr

### Information

- Change ownerNumber on [this section](https://github.com/inspirasiprogrammer/whatsapp-bot/blob/master/settings/setting.json#L2)
- Change groupLimit on [this section](https://github.com/inspirasiprogrammer/whatsapp-bot/blob/master/settings/setting.json#L3)
- Change memberLimit on [this section](https://github.com/inspirasiprogrammer/whatsapp-bot/blob/master/settings/setting.json#L4)
- Change prefix on [this section](https://github.com/inspirasiprogrammer/whatsapp-bot/blob/master/settings/setting.json#L5)
- Change menu on [this section](https://github.com/inspirasiprogrammer/whatsapp-bot/blob/master/lib/menu.js#L32)

---

## Features

| Islam               | Yes |
| ------------------- | --- |
| List Surah          | ✅  |
| Info Surah          | ✅  |
| Surah               | ✅  |
| Tafsir Alquran      | ✅  |
| Alquran Audio/Voice | ✅  |

| Searchs       | Yes |
| ------------- | --- |
| Resep makanan | ✅  |

| Random text   | Yes |
| ------------- | --- |
| Pantun        | ✅  |
| Fakta Menarik | ✅  |
| Kata Bijak    | ✅  |
| Quotes        | ✅  |

| Groups              | Yes |
| ------------------- | --- |
| Owner               |     |
| Kick all members    | ✅  |
| Admin               |     |
| Add user            | ✅  |
| Kick user           | ✅  |
| Promote User        | ✅  |
| Demote User         | ✅  |
| Mute Group          | ✅  |
| Change Group icon   | ✅  |
| Delete bot msg      | ✅  |
| Tagall/mentions all | ✅  |
| Welcome ON/OFF      | ✅  |

| Owner bot       | Yes |
| --------------- | --- |
| Broadcast       | ✅  |
| Leave all group | ✅  |
| Delete all msgs | ✅  |
| Banned user     | ✅  |

## To-Do

- Add Media Downloader
- Add More Feature
- More refactoring

---

## Troubleshooting

Make sure all the necessary dependencies are installed: https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md

Fix Stuck on linux, install google chrome stable:

```bash
> wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
> sudo apt install ./google-chrome-stable_current_amd64.deb
```

## Thanks

- [whatsapp-bot](https://github.com/ArugaZ/whatsapp-bot.git)
- [WA-Automate](https://github.com/open-wa/wa-automate-nodejs)
- [YogaSakti](https://github.com/YogaSakti/imageToSticker)
- [MhankBarBar](https://github.com/MhankBarBar/whatsapp-bot)
- [dandyraka](https://github.com/dandyraka/NoBadWord)
