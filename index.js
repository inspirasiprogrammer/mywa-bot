const { create, Client } = require('@open-wa/wa-automate')
const figlet = require('figlet')
const options = require('./utils/options')
const { color, messageLog } = require('./utils')
const HandleMsg = require('./HandleMsg')

const start = (_client = new Client()) => {
    console.log(color(figlet.textSync('----------------', { horizontalLayout: 'default' })))
    console.log(color(figlet.textSync('WhatsAppp Bot', { font: 'Ghost', horizontalLayout: 'default' })))
    console.log(color(figlet.textSync('----------------', { horizontalLayout: 'default' })))
    console.log(color('[~>>]'), color('BOT Started!', 'green'))

    // Mempertahankan sesi agar tetap nyala
    _client.onStateChanged((state) => {
        console.log(color('[~>>]', 'red'), state)
        if (state === 'CONFLICT' || state === 'UNLAUNCHED') _client.forceRefocus()
    })

    // ketika bot diinvite ke dalam group
    _client.onAddedToGroup(async(chat) => {
        const groups = await _client.getAllGroups()
            // kondisi ketika batas group bot telah tercapai,ubah di file settings/setting.json
        if (groups.length > groupLimit) {
            await _client.sendText(chat.id, `Sorry, the group on this Bot is full\nMax Group is: ${groupLimit}`).then(() => {
                _client.leaveGroup(chat.id)
                _client.deleteChat(chat.id)
            })
        } else {
            // kondisi ketika batas member group belum tercapai, ubah di file settings/setting.json
            if (chat.groupMetadata.participants.length < memberLimit) {
                await _client.sendText(chat.id, `Sorry, Bot comes out if the group members do not exceed ${memberLimit} people`).then(() => {
                    _client.leaveGroup(chat.id)
                    _client.deleteChat(chat.id)
                })
            } else {
                await _client.simulateTyping(chat.id, true).then(async() => {
                    await _client.sendText(chat.id, `Hai minna~, I'm WhatsApp Bot. To find out the commands on this bot type ${prefix}menu`)
                })
            }
        }
    })

    // ketika seseorang masuk/keluar dari group
    _client.onGlobalParicipantsChanged(async(event) => {
        const host = await _client.getHostNumber() + '@c.us'
        const welcome = JSON.parse(fs.readFileSync('./settings/welcome.json'))
        const isWelcome = welcome.includes(event.chat)
        let profile = await _client.getProfilePicFromServer(event.who)
        if (profile == '' || profile == undefined) profile = 'https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTQcODjk7AcA4wb_9OLzoeAdpGwmkJqOYxEBA&usqp=CAU'
            // kondisi ketika seseorang diinvite/join group lewat link
        if (event.action === 'add' && event.who !== host && isWelcome) {
            await _client.sendFileFromUrl(event.chat, profile, 'profile.jpg', '')
            await _client.sendTextWithMentions(event.chat, `Hello, Welcome to the group @${event.who.replace('@c.us', '')} \n\nHave fun with us✨`)
        }
        // kondisi ketika seseorang dikick/keluar dari group
        if (event.action === 'remove' && event.who !== host) {
            await _client.sendFileFromUrl(event.chat, profile, 'profile.jpg', '')
            await _client.sendTextWithMentions(event.chat, `Good bye @${event.who.replace('@c.us', '')}, We'll miss you✨`)
        }
    })

    _client.onIncomingCall(async(callData) => {
        // ketika seseorang menelpon nomor bot akan mengirim pesan
        await _client.sendText(callData.peerJid, 'Maaf sedang tidak bisa menerima panggilan.\n\n-bot')
            .then(async() => {
                // bot akan memblock nomor itu
                await _client.contactBlock(callData.peerJid)
            })
    })

    // ketika seseorang mengirim pesan
    _client.onMessage(async(message) => {
        _client.getAmountOfLoadedMessages() // menghapus pesan cache jika sudah 3000 pesan.
            .then((msg) => {
                if (msg >= 3000) {
                    console.log('[_client]', color(`Loaded Message Reach ${msg}, cuting message cache...`, 'yellow'))
                    _client.cutMsgCache()
                }
            })
        HandleMsg(_client, message)
    })

    // Message log for analytic
    _client.onAnyMessage((anal) => {
        messageLog(anal.fromMe, anal.type)
    })
}

//create session
create(options(true, start))
    .then((_client) => start(_client))
    .catch((err) => new Error(err))