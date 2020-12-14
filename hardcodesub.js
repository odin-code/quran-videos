const fs = require('fs')
const path = require('path')
const {
  spawnSync
} = require('child_process')
const fetch = require('node-fetch')

// puppeteer-extra is a drop-in replacement for puppeteer,
// it augments the installed puppeteer with plugin functionality.
// Any number of plugins can be added through `puppeteer.use()`
const puppeteer = require('puppeteer-extra')

// Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

// Add adblocker plugin to block all ads and trackers (saves bandwidth)
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
puppeteer.use(AdblockerPlugin({ blockTrackers: true }))

// each index corresponds to 001.mp4 .. to n.mp4
// Duration of pixabay videos in seconds
const pixabayDuration = [18, 13, 41, 38, 28, 30, 11, 39, 20, 18, 30, 32, 30, 50]
// Duration by chapter wise in seconds
const chapDuration = [47, 7265, 4792, 4770, 3758, 4338, 4793, 1822, 3625, 2689, 2771, 2516, 1213, 1217, 955, 2531, 1988, 1997, 1273, 1628, 1570, 1767, 1487, 1959, 1177, 1967, 1672, 2033, 1358, 1161, 653, 477, 1596, 1040, 966, 1057, 1463, 1060, 1628, 1567, 1149, 1165, 1226, 574, 638, 952, 733, 717, 496, 559, 551, 491, 467, 489, 691, 731, 822, 606, 623, 447, 287, 209, 252, 320, 357, 354, 445, 452, 402, 315, 278, 331, 240, 322, 208, 312, 284, 271, 238, 203, 127, 112, 288, 146, 181, 89, 96, 122, 196, 107, 74, 100, 55, 35, 60, 84, 36, 114, 50, 61, 54, 53, 21, 48, 40, 34, 49, 16, 45, 26, 32, 14, 24, 41]

const pixabayPath = path.join(__dirname, 'pixabay videos')

const audioPath = path.join(__dirname, 'audios')

// stores the end result
const hardcodedSubPath = path.join(__dirname, 'output')

const subtitlesPath = path.join(__dirname, 'subtitles')

// stores the editions to be added priority wise
const editionsList = ['eng-muhammadasad', 'zho-majian1', 'zho-muhammadmakin', 'spa-raulgonzalezbor', 'ara-sirajtafseer', 'hin-suhelfarooqkhan', 'ben-zohurulhoque', 'rus-vporokhova', 'por-samirelhayek', 'ace-tgkhmahjiddinju', 'afr-imammabaker', 'amh-muhammedsadiqan', 'ara-sirajtafseer', 'asm-shaykhrafeequli', 'aze-vasimmammadaliy', 'bam-deenmuhammad', 'ber-ramdaneatmansou', 'bos-wwwislamhouseco', 'bul-tzvetantheophan', 'cat-yousseflyoussi', 'ces-prekladihrbek', 'dag-muhammadbabaght', 'dan-vandetaal', 'deu-frankbubenheima', 'div-officeofthepres', 'epo-hadiabdollahian', 'fas-unknown', 'fil-wwwislamhouseco', 'fin-unknown', 'fra-shahnazsaidiben', 'guj-rabilaalomari', 'hau-abubakarmahmoud', 'heb-unknown', 'hrv-unknown', 'hun-drahmedabdelrah', 'ilp-abdulazizgroaal', 'ind-unknown', 'ita-hamzarobertopic', 'jav-unknown', 'jpn-ryoichimita', 'kan-abdussalamputhi', 'kaz-khalifahaltaich', 'khm-cambodianmuslim', 'kin-rmcrwanda', 'kir-shamsaldinhakim', 'kmr-unknown', 'knx-unknown', 'kor-unknown', 'kur-muhammadsalehba', 'lat-hadiabdollahian', 'lug-fareeqmusa', 'luy-mohammadramadha', 'mal-muhammadkarakun', 'mar-muhammadshafiia', 'mkd-sheikhhassangil', 'mlt-martinrzammitmu', 'mrw-guroalimsaroman', 'msa-abdullahmuhamma', 'mya-hashimtinmyint', 'nep-ahlalhadithcent', 'nld-unknown', 'nor-einarberg', 'nya-alhajiyusufmuha', 'orm-ghaliapapurapag', 'pan-drmuhamadhabibb', 'pol-jozefabielawski', 'pus-zakariaabulsala', 'ron-unknown', 'run-sheikhamissirad', 'sin-wwwislamhouseco', 'slk-hadiabdollahian', 'sna-abdullahjmadini', 'snd-tajmehmoodamrot', 'som-shaykhmahmoodmu', 'sot-sheikheliaskeke', 'sqi-unknown', 'swa-alimuhsinalbarw', 'swe-knutbernstrom', 'tam-janturstfoundat', 'tat-yakubibnnugman', 'tel-abdulraheemmoha', 'tgk-wwwislamhouseco', 'tha-kingfahadquranc', 'tur-ynozturk', 'uig-shaykhmuhammads', 'ukr-yakubovych', 'urd-abulaalamaududi', 'uzb-muhammadsodikmu', 'vie-hassanabdulkari', 'xho-imaamismaaeelng', 'yor-shaykhaburahima', 'zul-iqembulezifundi']

// keep track of where to start
const stateFile = path.join(__dirname, 'state.txt')

// Keep track of number of files uploaded
const maxuploads = 95
let uploaded = 0

const [email, pass] = fs.readFileSync(path.join(__dirname, 'config.ini')).toString().split(/\r?\n/).map(e => e.trim())

const apiLink = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1'
const editionsLink = apiLink + '/editions'

// browser related values
let browser, page
const height = 1024
const width = 1280
const timeout = 60000

const uploadURL = 'https://www.youtube.com/upload'
const studioURL = 'https://studio.youtube.com'

const metadataPath = path.join(__dirname, 'metadata')
const titlePath = path.join(metadataPath, 'titles')
// Translated tags & description
const tagsPath = path.join(metadataPath, 'tags.json')
const tagsJSON = readJSON(tagsPath)
const descriptionPath = path.join(metadataPath, 'description.json')
const descriptionJSON = readJSON(descriptionPath)
let titleJSON
// Youtube dropdown languages
let ytLangs = ['Abkhazian', 'Afar', 'Afrikaans', 'Akan', 'Albanian', 'American Sign Language', 'Amharic', 'Arabic', 'Aramaic', 'Armenian', 'Assamese', 'Aymara', 'Azerbaijani', 'Bangla', 'Bashkir', 'Basque', 'Belarusian', 'Bhojpuri', 'Bislama', 'Bosnian', 'Breton', 'Bulgarian', 'Burmese', 'Cantonese', 'Cantonese (Hong Kong)', 'Catalan', 'Cherokee', 'Chinese', 'Chinese (China)', 'Chinese (Hong Kong)', 'Chinese (Simplified)', 'Chinese (Singapore)', 'Chinese (Taiwan)', 'Chinese (Traditional)', 'Choctaw', 'Corsican', 'Croatian', 'Czech', 'Danish', 'Dutch', 'Dutch (Belgium)', 'Dutch (Netherlands)', 'Dzongkha', 'English', 'English (Canada)', 'English (India)', 'English (Ireland)', 'English (United Kingdom)', 'English (United States)', 'Esperanto', 'Estonian', 'Faroese', 'Fijian', 'Filipino', 'Filipino', 'Finnish', 'French', 'French (Belgium)', 'French (Canada)', 'French (France)', 'French (Switzerland)', 'Fulah', 'Galician', 'Georgian', 'German', 'German (Austria)', 'German (Germany)', 'German (Switzerland)', 'Greek', 'Guarani', 'Gujarati', 'Haitian Creole', 'Hakka Chinese', 'Hakka Chinese (Taiwan)', 'Hausa', 'Hebrew', 'Hindi', 'Hindi (Latin)', 'Hiri Motu', 'Hungarian', 'Icelandic', 'Igbo', 'Indonesian', 'Interlingua', 'Interlingue', 'Inuktitut', 'Inupiaq', 'Irish', 'Italian', 'Japanese', 'Javanese', 'Kalaallisut', 'Kannada', 'Kashmiri', 'Kazakh', 'Khmer', 'Kinyarwanda', 'Klingon', 'Korean', 'Kurdish', 'Kyrgyz', 'Lao', 'Latin', 'Latvian', 'Lingala', 'Lithuanian', 'Luxembourgish', 'Macedonian', 'Malagasy', 'Malay', 'Malayalam', 'Maltese', 'Manipuri', 'Maori', 'Marathi', 'Masai', 'Min Nan Chinese', 'Min Nan Chinese (Taiwan)', 'Mizo', 'Mongolian', 'Nauru', 'Navajo', 'Nepali', 'Norwegian', 'Occitan', 'Odia', 'Oromo', 'Pashto', 'Persian', 'Persian (Afghanistan)', 'Persian (Iran)', 'Polish', 'Portuguese', 'Portuguese (Brazil)', 'Portuguese (Portugal)', 'Punjabi', 'Quechua', 'Romanian', 'Romanian', 'Romansh', 'Rundi', 'Russian', 'Russian (Latin)', 'Samoan', 'Sango', 'Sanskrit', 'Sardinian', 'Scottish Gaelic', 'Serbian', 'Serbian (Cyrillic)', 'Serbian (Latin)', 'Serbian (Latin)', 'Sherdukpen', 'Shona', 'Sicilian', 'Sindhi', 'Sinhala', 'Slovak', 'Slovenian', 'Somali', 'Southern Sotho', 'Spanish', 'Spanish (Latin America)', 'Spanish (Mexico)', 'Spanish (Spain)', 'Spanish (United States)', 'Sundanese', 'Swahili', 'Swati', 'Swedish', 'Tajik', 'Tamil', 'Tatar', 'Telugu', 'Thai', 'Tibetan', 'Tigrinya', 'Tok Pisin', 'Tongan', 'Tsonga', 'Tswana', 'Turkish', 'Turkmen', 'Ukrainian', 'Urdu', 'Uzbek', 'Vietnamese', 'Volapük', 'Võro', 'Welsh', 'Western Frisian', 'Wolof', 'Xhosa', 'Yiddish', 'Yoruba', 'Zulu']
ytLangs = ytLangs.map(e => e.toLowerCase())

// Stores the playlist option to select
let playlistToSelect
// stores the editionName, which is being uploaded
let editionName

// Youtube dropdown Language names to Edition Language names mappings for not similar names
const ytToEditionLang = {
  pashto: 'pushto',
  uyghur: 'uighur',
  punjabi: 'panjabi',
  kyrgyz: 'kirghiz',
  kurdish: 'kurmanji',
  'Southern Sotho': 'sotho',
  'Chinese (Simplified)': 'chinese(simplified)',
  'Chinese (Traditional)': 'chinese(traditional)'
}

// Google translate Language names to Edition Language names mappings for not similar names
const gTransToEditionLang = {
  'myanmar(burmese)': 'burmese',
  pashto: 'pushto',
  uyghur: 'uighur',
  punjabi: 'panjabi',
  kyrgyz: 'kirghiz',
  'kurdish(kurmanji)': 'kurmanji',
  sesotho: 'sotho'
}
// Holds Edition name to Edition Language mapping
let edHolder

// youtube dropdown to edition name mappings
const submapped = {
  'Chinese (China)': 'zho-mazhonggang',
  'Chinese (Hong Kong)': 'zho-muhammadmakin',
  'Chinese (Simplified)': 'zho-majian',
  'Chinese (Singapore)': 'zho-muhammadmakin-la',
  'Chinese (Taiwan)': 'zho-majian1',
  'Chinese (Traditional)': 'zho-anonymousgroupo',
  'Dutch (Belgium)': 'nld-fredleemhuis',
  'Dutch (Netherlands)': 'nld-salomokeyzer',
  'English (Canada)': 'eng-ummmuhammad',
  'English (India)': 'eng-miraneesuddin',
  'English (Ireland)': 'eng-themonotheistgr',
  'English (United Kingdom)': 'eng-thestudyquran',
  'English (United States)': 'eng-safikaskas',
  'French (Belgium)': 'fra-islamicfoundati',
  'French (Canada)': 'fra-muhammadhameedu',
  'French (France)': 'fra-shahnazsaidiben',
  'French (Switzerland)': 'fra-muhammadhamidul',
  Kyrgyz: 'kir-shamsaldinhakim',
  'German (Austria)': 'deu-aburidamuhammad',
  'German (Germany)': 'deu-adeltheodorkhou',
  'German (Switzerland)': 'deu-amirzaidan',
  'Hindi (Latin)': 'hin-suhelfarooqkhan-la',
  Pashto: 'pus-abdulwalikhan',
  'Persian (Afghanistan)': 'fas-abdolmohammaday',
  'Persian (Iran)': 'fas-abolfazlbahramp',
  'Portuguese (Brazil)': 'por-helminasr',
  'Portuguese (Portugal)': 'por-samirelhayek',
  Punjabi: 'pan-drmuhamadhabibb',
  'Russian (Latin)': 'rus-abuadel_la',
  'Southern Sotho': 'sot-sheikheliaskeke',
  'Spanish (Latin America)': 'spa-abdulqadermouhe',
  'Spanish (Mexico)': 'spa-juliocorte',
  'Spanish (Spain)': 'spa-islamicfoundati',
  'Spanish (United States)': 'spa-muhammadasadabd',
  Bangla: 'ben-abubakrzakaria',
  Afar: 'aar-sheikhmahmoudab',
  Afrikaans: 'afr-imammabaker',
  Albanian: 'sqi-unknown',
  Amharic: 'amh-muhammedsadiqan',
  Arabic: 'ara-sirajtafseer',
  Assamese: 'asm-shaykhrafeequli',
  Azerbaijani: 'aze-vasimmammadaliy',
  Bosnian: 'bos-wwwislamhouseco',
  Bulgarian: 'bul-tzvetantheophan',
  Burmese: 'mya-hashimtinmyint',
  Catalan: 'cat-yousseflyoussi',
  Croatian: 'hrv-unknown',
  Czech: 'ces-prekladihrbek',
  Danish: 'dan-vandetaal',
  Dutch: 'nld-unknown',
  English: 'eng-wahiduddinkhan',
  Esperanto: 'epo-hadiabdollahian',
  Filipino: 'fil-wwwislamhouseco',
  Finnish: 'fin-unknown',
  French: 'fra-shahnazsaidiben',
  German: 'deu_frankbubenheim',
  Gujarati: 'guj-rabilaalomari',
  Hausa: 'hau-abubakarmahmoud',
  Hebrew: 'heb-unknown',
  Hindi: 'hin-suhelfarooqkhan',
  Hungarian: 'hun-drahmedabdelrah',
  Indonesian: 'ind-unknown',
  Italian: 'ita-hamzarobertopic',
  Japanese: 'jpn-ryoichimita',
  Javanese: 'jav-unknown',
  Kannada: 'kan-abdussalamputhi',
  Kazakh: 'kaz-khalifahaltaich',
  Khmer: 'khm-cambodianmuslim',
  Kinyarwanda: 'kin-rmcrwanda',
  Korean: 'kor-unknown',
  Kurdish: 'kur-muhammadsalehba',
  Latin: 'lat-hadiabdollahian',
  Macedonian: 'mkd-sheikhhassangil',
  Malay: 'msa-abdullahmuhamma',
  Malayalam: 'mal-muhammadkarakun',
  Maltese: 'mlt-martinrzammitmu',
  Marathi: 'mar-muhammadshafiia',
  Nepali: 'nep-ahlalhadithcent',
  Norwegian: 'nor-einarberg',
  Oromo: 'orm-ghaliapapurapag',
  Persian: 'fas-unknown',
  Polish: 'pol-jozefabielawski',
  Portuguese: 'por-samirelhayek',
  Romanian: 'ron-unknown',
  Rundi: 'run-sheikhamissirad',
  Russian: 'rus-vporokhova',
  Shona: 'sna-abdullahjmadini',
  Sindhi: 'snd-tajmehmoodamrot',
  Sinhala: 'sin-wwwislamhouseco',
  Slovak: 'slk-hadiabdollahian',
  Somali: 'som-shaykhmahmoodmu',
  Spanish: 'spa-raulgonzalezbor',
  Swahili: 'swa-alimuhsinalbarw',
  Swedish: 'swe-knutbernstrom',
  Tajik: 'tgk-wwwislamhouseco',
  Tamil: 'tam-janturstfoundat',
  Tatar: 'tat-yakubibnnugman',
  Telugu: 'tel-abdulraheemmoha',
  Thai: 'tha-kingfahadquranc',
  Turkish: 'tur-ynozturk',
  Ukrainian: 'ukr-yakubovych',
  Urdu: 'urd-syedzeeshanhaid',
  Uzbek: 'uzb-muhammadsodikmu',
  Vietnamese: 'vie-hassanabdulkari',
  Xhosa: 'xho-imaamismaaeelng',
  Yoruba: 'yor-shaykhaburahima',
  Zulu: 'zul-iqembulezifundi'
}

// capitalizes all the first letters in a sentense
const capitalize = words => words.split(' ').map(w => w[0].toUpperCase() + w.substring(1)).join(' ')

// generate random video larger than chapter
async function generateVideos () {
  const [editionsJSON] = await getLinksJSON([editionsLink + '.min.json'])
  // Edition name to Edition Language mapping
  edHolder = {}
  for (const value of Object.values(editionsJSON)) { edHolder[value.name] = value.language }

  const pixabayFiles = fs.readdirSync(pixabayPath).sort()
  let chap;
  [editionName, chap, playlistToSelect] = getState()

  const editionLang = edHolder[editionName].toLowerCase()
  await login()

  for (;chap <= 114; chap++) {
    const randomNo = getRandomNo(pixabayFiles.length)
    // Pixabay Videos to use for recitation
    const pixaFileWithPath = path.join(pixabayPath, pixabayFiles[randomNo])

    // Increase the video size to more than chapter duration
    const repeat = Math.ceil(chapDuration[chap - 1] / pixabayDuration[randomNo])

    // var outputsub = spawnSync('ffmpeg', ['-i', 'merged/'+(i+"").padStart(3, '0')+'.mp4','-i','chap/'+(i+"").padStart(3, '0')+'.mp3','-vf',"subtitles=subtitles/eng-miraneesuddin/1.srt:force_style='Alignment=2,OutlineColour=&H100000000,BorderStyle=3,Outline=1,Shadow=0,Fontsize=18,MarginL=0,MarginV=60'",'-crf','24','-vcodec','libx264','-map','0:v','-map','1:a','-c:a','copy','-shortest','withsub/'+(i+"").padStart(3, '0')+'.mp4'])

    const paddedI = (chap + '').padStart(3, '0')
    const fileSavePath = path.join(hardcodedSubPath, paddedI + '.mp4')
    spawnSync('ffmpeg', ['-stream_loop', repeat, '-i', pixaFileWithPath, '-i', path.join(audioPath, paddedI + '.mp3'), '-vf', 'subtitles=subtitles/' + editionName + '/' + chap + ".srt:force_style='Alignment=2,OutlineColour=&H100000000,BorderStyle=3,Outline=1,Shadow=0,Fontsize=18,MarginL=0,MarginV=60'", '-crf', '24', '-vcodec', 'libx264', '-map', '0:v', '-map', '1:a', '-c:a', 'copy', '-shortest', fileSavePath])

    // write code to upload the video using actions script
    await uploadWithSub(fileSavePath, editionLang, chap)

    uploaded++

    // Delete the uploaded video to save space in actions
    fs.unlinkSync(fileSavePath)

    // stop if uploaded files had reached the youtube upload limit
    if (uploaded >= maxuploads) { break }
  }

  const editionIndex = editionsList.indexOf(editionName)
  // if all the chapters are uploaded, then save new edition & chapter 1
  if (chap > 114) { saveState(editionsList[editionIndex + 1], 1) }
  // if the break is due to reaching max upload rates, then save the editionName & next chapter to be uploaded next time
  else {
    saveState(editionName, chap + 1)
  }
}

async function begin () {
  await launchBrowser()
  await generateVideos()
  await generateVideos()
  await browser.close()
}

begin()

// get the yesterdays state, so to continue uploading
function getState () {
  const statevals = fs.readFileSync(stateFile).toString().split(/\r?\n/)
  return [statevals[0], parseInt(statevals[1]), statevals[2]]
}

// save the state
function saveState (editionNameArg, chap) {
  fs.writeFileSync(stateFile, editionNameArg + '\n' + chap + '\n' + playlistToSelect)
}

// Generates random number
function getRandomNo (max) {
  return Math.floor(Math.random() * Math.floor(max))
}

function getKeyByValue (obj, value) {
  return Object.keys(obj).find(key => obj[key].toLowerCase() === value.toLowerCase())
}

// context and browser is a global variable and it can be accessed from anywhere
// function that launches a browser
async function launchBrowser () {
  browser = await puppeteer.launch({ headless: false })
  page = await browser.newPage()
  await page.setDefaultTimeout(timeout)
  await page.setViewport({ width: width, height: height })
}

async function login () {
  await page.goto(uploadURL)
  await page.type('input[type="email"]', email)
  await page.keyboard.press('Enter')
  await page.waitForNavigation({
    waitUntil: 'networkidle0'
  })
  await sleep(1000)
  await page.waitForSelector('input[type="password"]')
  await page.type('input[type="password"]', pass)

  await page.keyboard.press('Enter')

  await page.waitForNavigation()
}

function readJSON (pathToJSON) {
  const jsonStr = fs.readFileSync(pathToJSON).toString()
  return JSON.parse(jsonStr)
}

// https://www.shawntabrizi.com/code/programmatically-fetch-multiple-apis-parallel-using-async-await-javascript/
// Get links async i.e in parallel
async function getLinksJSON (urls) {
  return await Promise.all(
    urls.map(url => fetch(url).then(response => response.json()))
  ).catch(console.error)
}
// keep playlistBool true, only if its 1 chap
async function uploadWithSub (pathToFile, lang, chapter) {
  const chapTitlePath = path.join(titlePath, chapter + '.json')
  titleJSON = readJSON(chapTitlePath)
  // if language exists, then use the language name, otherwise get it from mappings objects
  const gtransLang = titleJSON[lang] ? lang : getKeyByValue(gTransToEditionLang, lang)
  const ytLang = ytLangs.includes(lang) ? capitalize(lang) : getKeyByValue(ytToEditionLang, lang)

  const title = titleJSON[gtransLang] ? titleJSON[gtransLang] : titleJSON.english + ' | ' + lang
  const description = descriptionJSON[gtransLang] ? descriptionJSON[gtransLang] : descriptionJSON.english
  let tags = tagsJSON[gtransLang] ? tagsJSON[gtransLang] : tagsJSON.english
  const newPlaylist = tags[0] + ' ' + lang
  const videoLang = ytLang || 'English'

  // Also add english tags in addition to translated tags
  if (gtransLang !== 'english') { tags = tags.concat(tagsJSON.english) }

  await page.goto(uploadURL)
  const selectBtn = await page.$x('//*[normalize-space(text())=\'Select files\']')
  const [fileChooser] = await Promise.all([
    page.waitForFileChooser(),
    selectBtn[0].click()
  //  page.click('#select-files-button > div') // button that triggers file selection
  ])
  await fileChooser.accept([pathToFile])
  // Wait until title & description box pops up
  await page.waitForFunction('document.querySelectorAll(\'[id="textbox"]\').length > 1')
  const textBoxes = await page.$x('//*[@id="textbox"]')
  // Add the title value
  await textBoxes[0].focus()
  await sleep(1000)
  await textBoxes[0].type(title)
  // Add the Description content
  await textBoxes[1].type(description)

  const childOption = await page.$x('//*[contains(text(),"No, it\'s")]')
  await childOption[0].click()

  const moreOption = await page.$x('//*[normalize-space(text())=\'More options\']')
  await moreOption[0].click()
  const playlist = await page.$x('//*[normalize-space(text())=\'Select\']')
  let createplaylistdone
  if (chapter === 1) {
    // Creating new playlist
    // click on playlist dropdown

    await page.evaluate(el => el.click(), playlist[0])
    // click New playlist button
    const newPlaylistXPath = '//*[normalize-space(text())=\'New playlist\']'
    await page.waitForXPath(newPlaylistXPath)
    const createplaylist = await page.$x(newPlaylistXPath)
    await page.evaluate(el => el.click(), createplaylist[0])
    // Enter new playlist name
    await page.keyboard.type(' ' + newPlaylist)
    // click create & then done button
    const createplaylistbtn = await page.$x('//*[normalize-space(text())=\'Create\']')
    await page.evaluate(el => el.click(), createplaylistbtn[1])
    createplaylistdone = await page.$x('//*[normalize-space(text())=\'Done\']')
    await page.evaluate(el => el.click(), createplaylistdone[0])
    // assign newPlaylist name, so in next chapter time it will be used to select that playlist
    playlistToSelect = newPlaylist
  } else {
  // Selecting playlist
    await page.evaluate(el => el.click(), playlist[0])
    const playlistToSelectXPath = '//*[normalize-space(text())=\'' + playlistToSelect + '\']'
    await page.waitForXPath(playlistToSelectXPath)
    const playlistName = await page.$x(playlistToSelectXPath)
    await page.evaluate(el => el.click(), playlistName[0])
    createplaylistdone = await page.$x('//*[normalize-space(text())=\'Done\']')
    await page.evaluate(el => el.click(), createplaylistdone[0])
  }
  // Add tags
  await page.type('[placeholder="Add tag"]', tags.map(e => e + ', ').join(''))

  // Selecting video language
  const langHandler = await page.$x('//*[normalize-space(text())=\'Video language\']')
  await page.evaluate(el => el.click(), langHandler[0])

  const langName = await page.$x('//*[normalize-space(text())=\'' + videoLang + '\']')
  await page.evaluate(el => el.click(), langName[langName.length - 1])
  // click next button
  const nextBtnXPath = '//*[normalize-space(text())=\'Next\']'
  let next = await page.$x(nextBtnXPath)
  await next[0].click()
  await sleep(3000)
  // click next button
  next = await page.$x(nextBtnXPath)
  await next[0].click()

  await sleep(3000)
  const uploadedLinkHandle = await page.$('[href^="https://youtu.be"]')
  const uploadedLink = await page.evaluate(e => e.getAttribute('href'), uploadedLinkHandle)
  fs.appendFileSync(path.join(__dirname, 'uploaded', editionName + '.txt'), 'chapter ' + chapter + ' ' + uploadedLink + '\n')

  // click publish
  const publish = await page.$x('//*[normalize-space(text())=\'Publish\']')
  // translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')
  await publish[0].click()
  await sleep(10000)
  // wait until uploading is done
  await page.waitForXPath('//*[contains(text(),"Finished processing")]', { timeout: 0 })
  // upload the subtitles
  await uploadSub(chapter, videoLang)
}

async function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// upload the subtitles
async function uploadSub (chapter, videoLang) {
  const holdersubmap = { ...submapped }

  await page.goto(studioURL)

  const subtitlesTab = await page.$x('//*[normalize-space(text())=\'Subtitles\']')
  await page.evaluate(el => el.click(), subtitlesTab[0])

  await page.waitForNavigation()

  await page.waitForSelector('[id="video-title"]')
  await page.waitForFunction('document.querySelectorAll(\'[id="video-title"]\').length > 5')

  const link = await page.evaluate(() => Array.from(document.querySelectorAll('[id="video-title"]')).map(e => e.href).filter(e => /.*?translations$/.test(e))[0])
  await page.goto(link)
  // upload the subtitle for current language
  await subPart(path.join(subtitlesPath, holdersubmap[videoLang], chapter + '.srt'))
  delete holdersubmap[videoLang]

  for (const [key, value] of Object.entries(holdersubmap)) {
    await sleep(2000)
    await addNewLang(key)

    const lang = edHolder[value].toLowerCase()
    const gtransLang = titleJSON[lang] ? lang : getKeyByValue(gTransToEditionLang, lang)
    const title = titleJSON[gtransLang] ? titleJSON[gtransLang] : titleJSON.english + ' | ' + lang
    const description = descriptionJSON[gtransLang] ? descriptionJSON[gtransLang] : descriptionJSON.english

    await sleep(1000)
    await titleDescPart(title, description)
    await sleep(1000)
    await subPart(path.join(subtitlesPath, value, chapter + '.srt'))
  }
}
// subtitles upload
async function subPart (pathToFile) {
  await page.waitForSelector('[id="add-translation"]')
  await page.evaluate(() => document.querySelectorAll('[id="add-translation"]')[0].click())
  await page.waitForSelector('[id="choose-upload-file"]')
  await page.click('#choose-upload-file')

  const continueBtn = await page.$x('//*[normalize-space(text())=\'Continue\']')

  // click ion Select Files & upload the file
  const [fileChooser] = await Promise.all([
    page.waitForFileChooser(),
    continueBtn[0].click() // button that triggers upload
  ])

  await fileChooser.accept([pathToFile])
  await sleep(2000)
  const publish = await page.$x('//*[normalize-space(text())=\'Publish\']')
  await publish[publish.length - 1].click()
}

// Add title & description in subtitles pages
async function titleDescPart (title, desc) {
  await page.waitForSelector('[id="add-translation"]')
  await page.evaluate(() => document.querySelectorAll('[id="add-translation"]')[0].click())

  await page.waitForSelector('[aria-label="Title *"]')
  // Add the title value
  await page.focus('[aria-label="Title *"]')
  await sleep(1000)
  await page.type('[aria-label="Title *"]', title)
  await sleep(500)
  // Add the title value
  // await page.focus(`[placeholder="Description"]`)
  // await sleep(1000)
  await page.type('[placeholder="Description"][spellcheck="true"]:enabled', desc)

  await sleep(3000)
  const publish = await page.$x('//*[normalize-space(text())=\'Publish\']')
  await publish[publish.length - 1].click()

  // change attribute values to avoid problems
  await page.evaluate(() => document.querySelector('[aria-label="Title *"]').setAttribute('aria-label', 'old title'))
  await page.evaluate(() => document.querySelector('[placeholder="Description"][spellcheck="true"]:enabled').setAttribute('placeholder', 'desc'))
}
// Select new language
async function addNewLang (langVal) {
  // Adding new language
  const Addlang = await page.$x('//*[normalize-space(text())=\'Add language\']')
  await page.evaluate(el => el.click(), Addlang[0])

  const langName = await page.$x('//*[normalize-space(text())=\'' + langVal + '\']')
  await page.evaluate(el => el.click(), langName[langName.length - 1])
}