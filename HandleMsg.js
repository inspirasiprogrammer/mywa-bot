require('dotenv').config()
const { decryptMedia } = require('@open-wa/wa-automate')

const moment = require('moment-timezone')
moment.tz.setDefault('Asia/Jakarta').locale('id')
const axios = require('axios')
const fetch = require('node-fetch')

const appRoot = require('app-root-path')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const db_group = new FileSync(appRoot + '/lib/data/group.json')
const db = low(db_group)
db.defaults({ group: [] }).write()

const {
    removeBackgroundFromImageBase64
} = require('remove.bg')

const {
    exec
} = require('child_process')

const {
    menuId,
    cekResi,
    urlShortener,
    translate,
    getLocationData,
    images,
    resep
} = require('./lib')

const {
    msgFilter,
    color,
    processTime,
    isUrl,
    download
} = require('./utils')

const { uploadImages } = require('./utils/fetcher')

const fs = require('fs-extra')
const banned = JSON.parse(fs.readFileSync('./settings/banned.json'))
const setting = JSON.parse(fs.readFileSync('./settings/setting.json'))
const welcome = JSON.parse(fs.readFileSync('./settings/welcome.json'))

let {
    ownerNumber,
    groupLimit,
    memberLimit,
    prefix
} = setting

const {
    apiNoBg,
    apiSimi
} = JSON.parse(fs.readFileSync('./settings/api.json'))

function formatin(duit) {
    let reverse = duit.toString().split('').reverse().join('');
    let ribuan = reverse.match(/\d{1,3}/g);
    ribuan = ribuan.join('.').split('').reverse().join('');
    return ribuan;
}

const inArray = (needle, haystack) => {
    let length = haystack.length;
    for (let i = 0; i < length; i++) {
        if (haystack[i].id == needle) return i;
    }
    return false;
}

module.exports = HandleMsg = async(_client, message) => {
        try {
            const { type, id, from, t, sender, author, isGroupMsg, chat, chatId, caption, isMedia, mimetype, quotedMsg, quotedMsgObj, mentionedJidList } = message
            let { body } = message
            var { name, formattedTitle } = chat
            let { pushname, verifiedName, formattedName } = sender
            pushname = pushname || verifiedName || formattedName // verifiedName is the name of someone who uses a business account
            const botNumber = await _client.getHostNumber() + '@c.us'
            const groupId = isGroupMsg ? chat.groupMetadata.id : ''
            const groupAdmins = isGroupMsg ? await _client.getGroupAdmins(groupId) : ''
            const isGroupAdmins = groupAdmins.includes(sender.id) || false
            const chats = (type === 'chat') ? body : (type === 'image' || type === 'video') ? caption : ''
            const pengirim = sender.id
            const isBotGroupAdmins = groupAdmins.includes(botNumber) || false

            // Bot Prefix
            body = (type === 'chat' && body.startsWith(prefix)) ? body : ((type === 'image' && caption || type === 'video' && caption) && caption.startsWith(prefix)) ? caption : ''
            const command = body.slice(1).trim().split(/ +/).shift().toLowerCase()
            const arg = body.trim().substring(body.indexOf(' ') + 1)
            const args = body.trim().split(/ +/).slice(1)
            const argx = chats.slice(0).trim().split(/ +/).shift().toLowerCase()
            const isCmd = body.startsWith(prefix)
            const uaOverride = process.env.UserAgent
            const url = args.length !== 0 ? args[0] : ''
            const isQuotedImage = quotedMsg && quotedMsg.type === 'image'
            const isQuotedVideo = quotedMsg && quotedMsg.type === 'video'

            // [IDENTIFY]
            const isOwnerBot = ownerNumber.includes(pengirim)
            const isBanned = banned.includes(pengirim)

            // [BETA] Avoid Spam Message
            if (isCmd && msgFilter.isFiltered(from) && !isGroupMsg) { return console.log(color('[SPAM]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname)) }
            if (isCmd && msgFilter.isFiltered(from) && isGroupMsg) { return console.log(color('[SPAM]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname), 'in', color(name || formattedTitle)) }
            //
            if (!isCmd && isGroupMsg) { console.log(color('[BADW]', 'orange'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${argx}`), 'from', color(pushname), 'in', color(name || formattedTitle)) }
            if (isCmd && !isGroupMsg) { console.log(color('[EXEC]'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname)) }
            if (isCmd && isGroupMsg) { console.log(color('[EXEC]'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname), 'in', color(name || formattedTitle)) }

            // [BETA] Avoid Spam Message
            msgFilter.addFilter(from)

            //[AUTO READ] Auto read message 
            _client.sendSeen(chatId)

            // Filter Banned People
            if (isBanned) {
                return console.log(color('[BAN]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname))
            }

            switch (command) {
                // Menu and About
                case 'speed':
                case 'ping':
                    await _client.sendText(from, `Pong!!!!\nSpeed: ${processTime(t, moment())} _Second_`)
                    break
                case 'about':
                    await _client.sendText(from, menuId.textAbout())
                    break
                case 'notes':
                case 'menu':
                case 'help':
                    await _client.sendText(from, menuId.textMenu(pushname))
                        .then(() => ((isGroupMsg) && (isGroupAdmins)) ? _client.sendText(from, `Menu Admin Grup: *${prefix}menuadmin*`) : null)
                    break
                case 'menuadmin':
                    if (!isGroupMsg) return _client.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
                    if (!isGroupAdmins) return _client.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
                    await _client.sendText(from, menuId.textAdmin())
                    break
                case 'donate':
                case 'donasi':
                    await _client.sendText(from, menuId.textDonasi())
                    break
                case 'ownerbot':
                    await _client.sendContact(from, ownerNumber)
                        .then(() => _client.sendText(from, 'Jika kalian ingin request fitur silahkan chat nomor owner!'))
                    break
                case 'join':
                    if (args.length == 0) return _client.reply(from, `Jika kalian ingin mengundang bot kegroup silahkan invite atau dengan\nketik ${prefix}join [link group]`, id)
                    let linkgrup = body.slice(6)
                    let islink = linkgrup.match(/(https:\/\/chat.whatsapp.com)/gi)
                    let chekgrup = await _client.inviteInfo(linkgrup)
                    if (!islink) return _client.reply(from, 'Maaf link group-nya salah! silahkan kirim link yang benar', id)
                    if (isOwnerBot) {
                        await _client.joinGroupViaLink(linkgrup)
                            .then(async() => {
                                await _client.sendText(from, 'Berhasil join grup via link!')
                                await _client.sendText(chekgrup.id, `Hai minna~, I'm WhatsApp Assistance Bot. To find out the commands on this Bot type ${prefix}menu`)
                            })
                    } else {
                        let cgrup = await _client.getAllGroups()
                        if (cgrup.length > groupLimit) return _client.reply(from, `Sorry, the group on this bot is full\nMax Group is: ${groupLimit}`, id)
                        if (cgrup.size < memberLimit) return _client.reply(from, `Sorry, Bot wil not join if the group members do not exceed ${memberLimit} people`, id)
                        await _client.joinGroupViaLink(linkgrup)
                            .then(async() => {
                                await _client.reply(from, 'Berhasil join grup via link!', id)
                            })
                            .catch(() => {
                                _client.reply(from, 'Gagal!', id)
                            })
                    }
                    break
                case 'botstat':
                    {
                        const loadedMsg = await _client.getAmountOfLoadedMessages()
                        const chatIds = await _client.getAllChatIds()
                        const groups = await _client.getAllGroups()
                        _client.sendText(from, `Status :\n- *${loadedMsg}* Loaded Messages\n- *${groups.length}* Group Chats\n- *${chatIds.length - groups.length}* Personal Chats\n- *${chatIds.length}* Total Chats`)
                        break
                    }
                case 'brainly':
                    if (!isGroupMsg) return _client.reply(from, 'Perintah ini hanya bisa di gunakan dalam group!', id)

                    if (args.length >= 2) {
                        const BrainlySearch = require('./lib/brainly')
                        let tanya = body.slice(9)
                        let jum = Number(tanya.split('.')[1]) || 2
                        if (jum > 10) return _client.reply(from, 'Max 10!', id)
                        if (Number(tanya[tanya.length - 1])) {
                            tanya
                        }
                        _client.reply(from, `➸ *Pertanyaan* : ${tanya.split('.')[0]}\n\n➸ *Jumlah jawaban* : ${Number(jum)}`, id)
                        await BrainlySearch(tanya.split('.')[0], Number(jum), function(res) {
                            res.forEach(x => {
                                if (x.jawaban.fotoJawaban.length == 0) {
                                    _client.reply(from, `➸ *Pertanyaan* : ${x.pertanyaan}\n\n➸ *Jawaban* : ${x.jawaban.judulJawaban}\n`, id)
                                    _client.sendText(from, 'Selesai ✅, donasi kesini ya paypal.me/TheSploit | Pulsa : 085754337101')
                                } else {
                                    _client.reply(from, `➸ *Pertanyaan* : ${x.pertanyaan}\n\n➸ *Jawaban* 〙: ${x.jawaban.judulJawaban}\n\n➸ *Link foto jawaban* : ${x.jawaban.fotoJawaban.join('\n')}`, id)
                                }
                            })
                        })
                    } else {
                        _client.reply(from, 'Usage :\n!brainly [pertanyaan] [.jumlah]\n\nEx : \n!brainly NKRI .2', id)
                    }
                    break
                    //Islam Command
                case 'listsurah':
                    try {
                        axios.get('https://raw.githubusercontent.com/inspirasiprogrammer/scraper-results/main/islam/surah.json')
                            .then((response) => {
                                let hehex = '╔══✪〘 List Surah 〙✪══\n'
                                for (let i = 0; i < response.data.data.length; i++) {
                                    hehex += '╠➥ '
                                    hehex += response.data.data[i].name.transliteration.id.toLowerCase() + '\n'
                                }
                                hehex += '╚═〘 *✪══════════✪* 〙'
                                _client.reply(from, hehex, id)
                            })
                    } catch (err) {
                        _client.reply(from, err, id)
                    }
                    break
                case 'infosurah':
                    if (args.length == 0) return _client.reply(from, `*_${prefix}infosurah <nama surah>_*\nMenampilkan informasi lengkap mengenai surah tertentu. Contoh penggunan: ${prefix}infosurah al-baqarah`, message.id)
                    var responseh = await axios.get('https://raw.githubusercontent.com/inspirasiprogrammer/scraper-results/main/islam/surah.json')
                    var { data } = responseh.data
                    var idx = data.findIndex(function(post, index) {
                        if ((post.name.transliteration.id.toLowerCase() == args[0].toLowerCase()) || (post.name.transliteration.en.toLowerCase() == args[0].toLowerCase()))
                            return true;
                    });
                    var pesan = ""
                    pesan = pesan + "Nama : " + data[idx].name.transliteration.id + "\n" + "Asma : " + data[idx].name.short + "\n" + "Arti : " + data[idx].name.translation.id + "\n" + "Jumlah ayat : " + data[idx].numberOfVerses + "\n" + "Nomor surah : " + data[idx].number + "\n" + "Jenis : " + data[idx].revelation.id + "\n" + "Keterangan : " + data[idx].tafsir.id
                    _client.reply(from, pesan, message.id)
                    break
                case 'surah':
                    if (args.length == 0) return _client.reply(from, `*_${prefix}surah <nama surah> <ayat>_*\nMenampilkan ayat Al-Quran tertentu beserta terjemahannya dalam bahasa Indonesia. Contoh penggunaan : ${prefix}surah al-baqarah 1\n\n*_${prefix}surah <nama surah> <ayat> en/id_*\nMenampilkan ayat Al-Quran tertentu beserta terjemahannya dalam bahasa Inggris / Indonesia. Contoh penggunaan : ${prefix}surah al-baqarah 1 id`, message.id)
                    var responseh = await axios.get('https://raw.githubusercontent.com/inspirasiprogrammer/scraper-results/main/islam/surah.json')
                    var { data } = responseh.data
                    var idx = data.findIndex(function(post, index) {
                        if ((post.name.transliteration.id.toLowerCase() == args[0].toLowerCase()) || (post.name.transliteration.en.toLowerCase() == args[0].toLowerCase()))
                            return true;
                    });
                    nmr = data[idx].number
                    if (!isNaN(nmr)) {
                        var responseh2 = await axios.get('https://api.quran.sutanlab.id/surah/' + nmr + "/" + args[1])
                        var { data } = responseh2.data
                        var last = function last(array, n) {
                            if (array == null) return void 0;
                            if (n == null) return array[array.length - 1];
                            return array.slice(Math.max(array.length - n, 0));
                        };
                        bhs = last(args)
                        pesan = ""
                        pesan = pesan + data.text.arab + "\n\n"
                        if (bhs == "en") {
                            pesan = pesan + data.translation.en
                        } else {
                            pesan = pesan + data.translation.id
                        }
                        pesan = pesan + "\n\n(Q.S. " + data.surah.name.transliteration.id + ":" + args[1] + ")"
                        _client.reply(from, pesan, message.id)
                    }
                    break
                case 'tafsir':
                    if (args.length == 0) return _client.reply(from, `*_${prefix}tafsir <nama surah> <ayat>_*\nMenampilkan ayat Al-Quran tertentu beserta terjemahan dan tafsirnya dalam bahasa Indonesia. Contoh penggunaan : ${prefix}tafsir al-baqarah 1`, message.id)
                    var responsh = await axios.get('https://raw.githubusercontent.com/inspirasiprogrammer/scraper-results/main/islam/surah.json')
                    var { data } = responsh.data
                    var idx = data.findIndex(function(post, index) {
                        if ((post.name.transliteration.id.toLowerCase() == args[0].toLowerCase()) || (post.name.transliteration.en.toLowerCase() == args[0].toLowerCase()))
                            return true;
                    });
                    nmr = data[idx].number
                    if (!isNaN(nmr)) {
                        var responsih = await axios.get('https://api.quran.sutanlab.id/surah/' + nmr + "/" + args[1])
                        var { data } = responsih.data
                        pesan = ""
                        pesan = pesan + "Tafsir Q.S. " + data.surah.name.transliteration.id + ":" + args[1] + "\n\n"
                        pesan = pesan + data.text.arab + "\n\n"
                        pesan = pesan + "_" + data.translation.id + "_" + "\n\n" + data.tafsir.id.long
                        _client.reply(from, pesan, message.id)
                    }
                    break
                case 'alaudio':
                    if (args.length == 0) return _client.reply(from, `*_${prefix}ALaudio <nama surah>_*\nMenampilkan tautan dari audio surah tertentu. Contoh penggunaan : ${prefix}ALaudio al-fatihah\n\n*_${prefix}ALaudio <nama surah> <ayat>_*\nMengirim audio surah dan ayat tertentu beserta terjemahannya dalam bahasa Indonesia. Contoh penggunaan : ${prefix}ALaudio al-fatihah 1\n\n*_${prefix}ALaudio <nama surah> <ayat> en_*\nMengirim audio surah dan ayat tertentu beserta terjemahannya dalam bahasa Inggris. Contoh penggunaan : ${prefix}ALaudio al-fatihah 1 en`, message.id)
                    ayat = "ayat"
                    bhs = ""
                    var responseh = await axios.get('https://raw.githubusercontent.com/inspirasiprogrammer/scraper-results/main/islam/surah.json')
                    var surah = responseh.data
                    var idx = surah.data.findIndex(function(post, index) {
                        if ((post.name.transliteration.id.toLowerCase() == args[0].toLowerCase()) || (post.name.transliteration.en.toLowerCase() == args[0].toLowerCase()))
                            return true;
                    });
                    nmr = surah.data[idx].number
                    if (!isNaN(nmr)) {
                        if (args.length > 2) {
                            ayat = args[1]
                        }
                        if (args.length == 2) {
                            var last = function last(array, n) {
                                if (array == null) return void 0;
                                if (n == null) return array[array.length - 1];
                                return array.slice(Math.max(array.length - n, 0));
                            };
                            ayat = last(args)
                        }
                        pesan = ""
                        if (isNaN(ayat)) {
                            var responsih2 = await axios.get('https://raw.githubusercontent.com/inspirasiprogrammer/scraper-results/main/islam/surah/' + nmr + '.json')
                            var { name, name_translations, number_of_ayah, number_of_surah, recitations } = responsih2.data
                            pesan = pesan + "Audio Quran Surah ke-" + number_of_surah + " " + name + " (" + name_translations.ar + ") " + "dengan jumlah " + number_of_ayah + " ayat\n"
                            pesan = pesan + "Dilantunkan oleh " + recitations[0].name + " : " + recitations[0].audio_url + "\n"
                            pesan = pesan + "Dilantunkan oleh " + recitations[1].name + " : " + recitations[1].audio_url + "\n"
                            pesan = pesan + "Dilantunkan oleh " + recitations[2].name + " : " + recitations[2].audio_url + "\n"
                            _client.reply(from, pesan, message.id)
                        } else {
                            var responsih2 = await axios.get('https://api.quran.sutanlab.id/surah/' + nmr + "/" + ayat)
                            var { data } = responsih2.data
                            var last = function last(array, n) {
                                if (array == null) return void 0;
                                if (n == null) return array[array.length - 1];
                                return array.slice(Math.max(array.length - n, 0));
                            };
                            bhs = last(args)
                            pesan = ""
                            pesan = pesan + data.text.arab + "\n\n"
                            if (bhs == "en") {
                                pesan = pesan + data.translation.en
                            } else {
                                pesan = pesan + data.translation.id
                            }
                            pesan = pesan + "\n\n(Q.S. " + data.surah.name.transliteration.id + ":" + args[1] + ")"
                            await _client.sendFileFromUrl(from, data.audio.secondary[0])
                            await _client.reply(from, pesan, message.id)
                        }
                    }
                    break
                    //Group All User
                case 'grouplink':
                    if (!isBotGroupAdmins) return _client.reply(from, 'Perintah ini hanya bisa di gunakan ketika bot menjadi admin', id)
                    if (isGroupMsg) {
                        const inviteLink = await _client.getGroupInviteLink(groupId);
                        _client.sendLinkWithAutoPreview(from, inviteLink, `\nLink group *${name}* Gunakan *${prefix}revoke* untuk mereset Link group`)
                    } else {
                        _client.reply(from, 'Perintah ini hanya bisa di gunakan dalam group!', id)
                    }
                    break
                case "revoke":
                    if (!isBotGroupAdmins) return _client.reply(from, 'Perintah ini hanya bisa di gunakan ketika bot menjadi admin', id)
                    if (isBotGroupAdmins) {
                        _client
                            .revokeGroupInviteLink(from)
                            .then((res) => {
                                _client.reply(from, `Berhasil Revoke Grup Link gunakan *${prefix}grouplink* untuk mendapatkan group invite link yang terbaru`, id);
                            })
                            .catch((err) => {
                                console.log(`[ERR] ${err}`);
                            });
                    }
                    break;
                    // Random Kata
                case 'motivasi':
                    fetch('https://raw.githubusercontent.com/selyxn/motivasi/main/motivasi.txt')
                        .then(res => res.text())
                        .then(body => {
                            let splitmotivasi = body.split('\n')
                            let randommotivasi = splitmotivasi[Math.floor(Math.random() * splitmotivasi.length)]
                            _client.reply(from, randommotivasi, id)
                        })
                        .catch(() => {
                            _client.reply(from, 'Ada yang Error!', id)
                        })
                    break
                case 'fakta':
                    fetch('https://raw.githubusercontent.com/inspirasiprogrammer/scraper-results/main/random/faktaunix.txt')
                        .then(res => res.text())
                        .then(body => {
                            let splitnix = body.split('\n')
                            let randomnix = splitnix[Math.floor(Math.random() * splitnix.length)]
                            _client.reply(from, randomnix, id)
                        })
                        .catch(() => {
                            _client.reply(from, 'Ada yang Error!', id)
                        })
                    break
                case 'katabijak':
                    fetch('https://raw.githubusercontent.com/inspirasiprogrammer/scraper-results/main/random/katabijax.txt')
                        .then(res => res.text())
                        .then(body => {
                            let splitbijak = body.split('\n')
                            let randombijak = splitbijak[Math.floor(Math.random() * splitbijak.length)]
                            _client.reply(from, randombijak, id)
                        })
                        .catch(() => {
                            _client.reply(from, 'Ada yang Error!', id)
                        })
                    break
                case 'pantun':
                    fetch('https://raw.githubusercontent.com/inspirasiprogrammer/scraper-results/main/random/pantun.txt')
                        .then(res => res.text())
                        .then(body => {
                            let splitpantun = body.split('\n')
                            let randompantun = splitpantun[Math.floor(Math.random() * splitpantun.length)]
                            _client.reply(from, randompantun.replace(/_client-line/g, "\n"), id)
                        })
                        .catch(() => {
                            _client.reply(from, 'Ada yang Error!', id)
                        })
                    break
                    // Search Any                
                case 'images':
                    if (args.length == 0) return _client.reply(from, `Untuk mencari gambar dari pinterest\nketik: ${prefix}images [search]\ncontoh: ${prefix}images naruto`, id)
                    const cariwall = body.slice(8)
                    const hasilwall = await images.fdci(cariwall)
                    await _client.sendFileFromUrl(from, hasilwall, '', '', id)
                        .catch(() => {
                            _client.reply(from, 'Ada yang Error!', id)
                        })
                    break
                case 'sreddit':
                    if (args.length == 0) return _client.reply(from, `Untuk mencari gambar dari sub reddit\nketik: ${prefix}sreddit [search]\ncontoh: ${prefix}sreddit naruto`, id)
                    const carireddit = body.slice(9)
                    const hasilreddit = await images.sreddit(carireddit)
                    await _client.sendFileFromUrl(from, hasilreddit, '', '', id)
                        .catch(() => {
                            _client.reply(from, 'Ada yang Error!', id)
                        })
                    break
                case 'resep':
                    if (args.length == 0) return _client.reply(from, `Untuk mencari resep makanan\nCaranya ketik: ${prefix}resep [search]\n\ncontoh: ${prefix}resep tahu`, id)
                    const cariresep = body.slice(7)
                    const hasilresep = await resep.resep(cariresep)
                    await _client.reply(from, hasilresep + '\n\nIni kak resep makanannya..', id)
                        .catch(() => {
                            _client.reply(from, 'Ada yang Error!', id)
                        })
                    break
                    // Other Command
                case 'resi':
                    if (args.length !== 2) return _client.reply(from, `Maaf, format pesan salah.\nSilahkan ketik pesan dengan ${prefix}resi <kurir> <no_resi>\n\nKurir yang tersedia:\njne, pos, tiki, wahana, jnt, rpx, sap, sicepat, pcp, jet, dse, first, ninja, lion, idl, rex`, id)
                    const kurirs = ['jne', 'pos', 'tiki', 'wahana', 'jnt', 'rpx', 'sap', 'sicepat', 'pcp', 'jet', 'dse', 'first', 'ninja', 'lion', 'idl', 'rex']
                    if (!kurirs.includes(args[0])) return _client.sendText(from, `Maaf, jenis ekspedisi pengiriman tidak didukung layanan ini hanya mendukung ekspedisi pengiriman ${kurirs.join(', ')} Tolong periksa kembali.`)
                    console.log('Memeriksa No Resi', args[1], 'dengan ekspedisi', args[0])
                    cekResi(args[0], args[1]).then((result) => _client.sendText(from, result))
                    break
                    // Group Commands (group admin only)
                case 'add':
                    if (!isGroupMsg) return _client.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
                    if (!isGroupAdmins) return _client.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
                    if (!isBotGroupAdmins) return _client.reply(from, 'Gagal, silahkan tambahkan bot sebagai admin grup!', id)
                    if (args.length !== 1) return _client.reply(from, `Untuk menggunakan ${prefix}add\nPenggunaan: ${prefix}add <nomor>\ncontoh: ${prefix}add 628xxx`, id)
                    try {
                        await _client.addParticipant(from, `${args[0]}@c.us`)
                    } catch {
                        _client.reply(from, 'Tidak dapat menambahkan target', id)
                    }
                    break
                case 'kick':
                    if (!isGroupMsg) return _client.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
                    if (!isGroupAdmins) return _client.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
                    if (!isBotGroupAdmins) return _client.reply(from, 'Gagal, silahkan tambahkan bot sebagai admin grup!', id)
                    if (mentionedJidList.length === 0) return _client.reply(from, 'Maaf, format pesan salah.\nSilahkan tag satu atau lebih orang yang akan dikeluarkan', id)
                    if (mentionedJidList[0] === botNumber) return await _client.reply(from, 'Maaf, format pesan salah.\nTidak dapat mengeluarkan akun bot sendiri', id)
                    await _client.sendTextWithMentions(from, `Request diterima, mengeluarkan:\n${mentionedJidList.map(x => `@${x.replace('@c.us', '')}`).join('\n')}`)
            for (let i = 0; i < mentionedJidList.length; i++) {
                if (groupAdmins.includes(mentionedJidList[i])) return await _client.sendText(from, 'Gagal, kamu tidak bisa mengeluarkan admin grup.')
                await _client.removeParticipant(groupId, mentionedJidList[i])
            }
            break
        case 'promote':
            if (!isGroupMsg) return _client.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
            if (!isGroupAdmins) return _client.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
            if (!isBotGroupAdmins) return _client.reply(from, 'Gagal, silahkan tambahkan bot sebagai admin grup!', id)
            if (mentionedJidList.length !== 1) return _client.reply(from, 'Maaf, hanya bisa mempromote 1 user', id)
            if (groupAdmins.includes(mentionedJidList[0])) return await _client.reply(from, 'Maaf, user tersebut sudah menjadi admin.', id)
            if (mentionedJidList[0] === botNumber) return await _client.reply(from, 'Maaf, format pesan salah.\nTidak dapat mempromote akun bot sendiri', id)
            await _client.promoteParticipant(groupId, mentionedJidList[0])
            await _client.sendTextWithMentions(from, `Request diterima, menambahkan @${mentionedJidList[0].replace('@c.us', '')} sebagai admin.`)
            break
        case 'demote':
            if (!isGroupMsg) return _client.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
            if (!isGroupAdmins) return _client.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
            if (!isBotGroupAdmins) return _client.reply(from, 'Gagal, silahkan tambahkan bot sebagai admin grup!', id)
            if (mentionedJidList.length !== 1) return _client.reply(from, 'Maaf, hanya bisa mendemote 1 user', id)
            if (!groupAdmins.includes(mentionedJidList[0])) return await _client.reply(from, 'Maaf, user tersebut belum menjadi admin.', id)
            if (mentionedJidList[0] === botNumber) return await _client.reply(from, 'Maaf, format pesan salah.\nTidak dapat mendemote akun bot sendiri', id)
            await _client.demoteParticipant(groupId, mentionedJidList[0])
            await _client.sendTextWithMentions(from, `Request diterima, menghapus jabatan @${mentionedJidList[0].replace('@c.us', '')}.`)
            break
        case 'bye':
            if (!isGroupMsg) return _client.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
            if (!isGroupAdmins) return _client.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
            _client.sendText(from, 'Good bye... ( ⇀‸↼‶ )').then(() => _client.leaveGroup(groupId))
            break
        case 'del':
            if (!isGroupAdmins) return _client.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
            if (!quotedMsg) return _client.reply(from, `Maaf, format pesan salah silahkan.\nReply pesan bot dengan caption ${prefix}del`, id)
            if (!quotedMsgObj.fromMe) return _client.reply(from, `Maaf, format pesan salah silahkan.\nReply pesan bot dengan caption ${prefix}del`, id)
            _client.deleteMessage(quotedMsgObj.chatId, quotedMsgObj.id, false)
            break
        case 'tagall':
        case 'everyone':
            if (!isGroupMsg) return _client.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
            if (!isGroupAdmins) return _client.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
            const groupMem = await _client.getGroupMembers(groupId)
            let hehex = '╔══✪〘 Mention All 〙✪══\n'
            for (let i = 0; i < groupMem.length; i++) {
                hehex += '╠➥'
                hehex += ` @${groupMem[i].id.replace(/@c.us/g, '')}\n`
            }
            hehex += '╚═〘 *✪══════════✪* 〙'
            await _client.sendTextWithMentions(from, hehex)
            break		
		case 'mutegrup':
			if (!isGroupMsg) return _client.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
            if (!isGroupAdmins) return _client.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
            if (!isBotGroupAdmins) return _client.reply(from, 'Gagal, silahkan tambahkan bot sebagai admin grup!', id)
			if (args.length !== 1) return _client.reply(from, `Untuk mengubah settingan group chat agar hanya admin saja yang bisa chat\n\nPenggunaan:\n${prefix}mutegrup on --aktifkan\n${prefix}mutegrup off --nonaktifkan`, id)
            if (args[0] == 'on') {
				_client.setGroupToAdminsOnly(groupId, true).then(() => _client.sendText(from, 'Berhasil mengubah agar hanya admin yang dapat chat!'))
			} else if (args[0] == 'off') {
				_client.setGroupToAdminsOnly(groupId, false).then(() => _client.sendText(from, 'Berhasil mengubah agar semua anggota dapat chat!'))
			} else {
				_client.reply(from, `Untuk mengubah settingan group chat agar hanya admin saja yang bisa chat\n\nPenggunaan:\n${prefix}mutegrup on --aktifkan\n${prefix}mutegrup off --nonaktifkan`, id)
			}
			break
		case 'setprofile':
			if (!isGroupMsg) return _client.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
            if (!isGroupAdmins) return _client.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
            if (!isBotGroupAdmins) return _client.reply(from, 'Gagal, silahkan tambahkan bot sebagai admin grup!', id)
			if (isMedia && type == 'image' || isQuotedImage) {
				const dataMedia = isQuotedImage ? quotedMsg : message
				const _mimetype = dataMedia.mimetype
				const mediaData = await decryptMedia(dataMedia, uaOverride)
				const imageBase64 = `data:${_mimetype};base64,${mediaData.toString('base64')}`
				await _client.setGroupIcon(groupId, imageBase64)
			} else if (args.length === 1) {
				if (!isUrl(url)) { await _client.reply(from, 'Maaf, link yang kamu kirim tidak valid.', id) }
				_client.setGroupIconByUrl(groupId, url).then((r) => (!r && r !== undefined)
				? _client.reply(from, 'Maaf, link yang kamu kirim tidak memuat gambar.', id)
				: _client.reply(from, 'Berhasil mengubah profile group', id))
			} else {
				_client.reply(from, `Commands ini digunakan untuk mengganti icon/profile group chat\n\n\nPenggunaan:\n1. Silahkan kirim/reply sebuah gambar dengan caption ${prefix}setprofile\n\n2. Silahkan ketik ${prefix}setprofile linkImage`)
			}
			break
		case 'welcome':
			if (!isGroupMsg) return _client.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
            if (!isGroupAdmins) return _client.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
            if (!isBotGroupAdmins) return _client.reply(from, 'Gagal, silahkan tambahkan bot sebagai admin grup!', id)
			if (args.length !== 1) return _client.reply(from, `Membuat BOT menyapa member yang baru join kedalam group chat!\n\nPenggunaan:\n${prefix}welcome on --aktifkan\n${prefix}welcome off --nonaktifkan`, id)
			if (args[0] == 'on') {
				welcome.push(chatId)
				fs.writeFileSync('./settings/welcome.json', JSON.stringify(welcome))
				_client.reply(from, 'Welcome Message sekarang diaktifkan!', id)
			} else if (args[0] == 'off') {
				let xporn = welcome.indexOf(chatId)
				welcome.splice(xporn, 1)
				fs.writeFileSync('./settings/welcome.json', JSON.stringify(welcome))
				_client.reply(from, 'Welcome Message sekarang dinonaktifkan', id)
			} else {
				_client.reply(from, `Membuat BOT menyapa member yang baru join kedalam group chat!\n\nPenggunaan:\n${prefix}welcome on --aktifkan\n${prefix}welcome off --nonaktifkan`, id)
			}
			break
			
        //Owner Group
        case 'kickall': //mengeluarkan semua member
        if (!isGroupMsg) return _client.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
        let isOwner = chat.groupMetadata.owner == pengirim
        if (!isOwner) return _client.reply(from, 'Maaf, perintah ini hanya dapat dipakai oleh owner grup!', id)
        if (!isBotGroupAdmins) return _client.reply(from, 'Gagal, silahkan tambahkan bot sebagai admin grup!', id)
            const allMem = await _client.getGroupMembers(groupId)
            for (let i = 0; i < allMem.length; i++) {
                if (groupAdmins.includes(allMem[i].id)) {

                } else {
                    await _client.removeParticipant(groupId, allMem[i].id)
                }
            }
            _client.reply(from, 'Success kick all member', id)
        break

        //Owner Bot
        case 'ban':
            if (!isOwnerBot) return _client.reply(from, 'Perintah ini hanya untuk Owner bot!', id)
            if (args.length == 0) return _client.reply(from, `Untuk banned seseorang agar tidak bisa menggunakan commands\n\nCaranya ketik: \n${prefix}ban add 628xx --untuk mengaktifkan\n${prefix}ban del 628xx --untuk nonaktifkan\n\ncara cepat ban banyak digrup ketik:\n${prefix}ban @tag @tag @tag`, id)
            if (args[0] == 'add') {
                banned.push(args[1]+'@c.us')
                fs.writeFileSync('./settings/banned.json', JSON.stringify(banned))
                _client.reply(from, 'Success banned target!')
            } else
            if (args[0] == 'del') {
                let xnxx = banned.indexOf(args[1]+'@c.us')
                banned.splice(xnxx,1)
                fs.writeFileSync('./settings/banned.json', JSON.stringify(banned))
                _client.reply(from, 'Success unbanned target!')
            } else {
             for (let i = 0; i < mentionedJidList.length; i++) {
                banned.push(mentionedJidList[i])
                fs.writeFileSync('./settings/banned.json', JSON.stringify(banned))
                _client.reply(from, 'Success ban target!', id)
                }
            }
            break
        case 'bc': //untuk broadcast atau promosi
            if (!isOwnerBot) return _client.reply(from, 'Perintah ini hanya untuk Owner bot!', id)
            if (args.length == 0) return _client.reply(from, `Untuk broadcast ke semua chat ketik:\n${prefix}bc [isi chat]`)
            let msg = body.slice(4)
            const chatz = await _client.getAllChatIds()
            for (let idk of chatz) {
                var cvk = await _client.getChatById(idk)
                if (!cvk.isReadOnly) _client.sendText(idk, `〘 ✪══════════✪ 〙\n\n${msg}`)
                if (cvk.isReadOnly) _client.sendText(idk, `〘 ✪══════════✪ 〙\n\n${msg}`)
            }
            _client.reply(from, 'Broadcast Success!', id)
            break
        case 'leaveall': //mengeluarkan bot dari semua group serta menghapus chatnya
            if (!isOwnerBot) return _client.reply(from, 'Perintah ini hanya untuk Owner bot', id)
            const allChatz = await _client.getAllChatIds()
            const allGroupz = await _client.getAllGroups()
            for (let gclist of allGroupz) {
                await _client.sendText(gclist.contact.id, `Maaf bot sedang pembersihan, total chat aktif : ${allChatz.length}`)
                await _client.leaveGroup(gclist.contact.id)
                await _client.deleteChat(gclist.contact.id)
            }
            _client.reply(from, 'Success leave all group!', id)
            break
        case 'clearall': //menghapus seluruh pesan diakun bot
            if (!isOwnerBot) return _client.reply(from, 'Perintah ini hanya untuk Owner bot', id)
            const allChatx = await _client.getAllChats()
            for (let dchat of allChatx) {
                await _client.deleteChat(dchat.id)
            }
            _client.reply(from, 'Success clear all chat!', id)
            break
        default:
            break
        }		
    } catch (err) {
        console.log(color('[EROR]', 'red'), err)
    }
}