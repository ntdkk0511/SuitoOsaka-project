const SPOTS_BASE_DATA = [
  {
    id: 'central-hall',
    name: '中央公会堂',
    englishName: 'Central Public Hall',
    lngLat: [135.50403026, 34.69352882],
    desc: '大正時代の美しい建築。現地では過去の姿がARで蘇ります。',
    quiz: {
      q: '中央公会堂の建築資金を寄付した、当時の大阪の相場師は誰でしょう？',
      choices: ['岩本栄之助', '五代友厚', '鴻池善右衛門'],
      ans: 0
    }
  },
  {
    id: 'nakanishima-park',
    name: '中之島公園 (バラ園)',
    englishName: 'Nakanoshima Park',
    lngLat: [135.5080964, 34.69230774],
    desc: '水辺に広がる大阪市内で最も古い公園。美しいバラと川の対比が見所です。',
    quiz: {
      q: '中之島公園が開園したのは、西暦何年でしょう？',
      choices: ['1889年 (明治22年)', '1912年 (明治45年)', '1930年 (昭和5年)'],
      ans: 0
    }
  },
  {
    id: 'osaka-castle-pier',
    name: '大阪城港 (水上バス乗り場)',
    englishName: 'Osaka Castle Pier',
    lngLat: [135.5327933, 34.68971791],
    desc: 'アクアライナー（水上バス）の発着拠点。ここから水の回廊を大冒険できます！',
    quiz: {
      q: '水上バス「アクアライナー」が、低い橋をくげる際が行う特殊な変形はどれ？',
      choices: ['船の屋根が下がる', '船体が左右に縮む', '船底が沈み込む'],
      ans: 0
    }
  },
  {
    id: 'oit-hirakata',
    name: '大阪工業大学 枚方キャンパス',
    englishName: 'OIT Hirakata Campus',
    lngLat: [135.7050764, 34.84130318],
    desc: '最新の情報技術やAI・データサイエンスを学ぶ情報科学部が集まるキャンパス。',
    quiz: {
      q: '大阪工業大学枚方キャンパスに設置されている専門学部はどれ？',
      choices: ['情報科学部', '薬学部', '文学部', '医学部'],
      ans: 0
    }
  },
  {
    id: 'cosmos-kitayama',
    name: 'ディスカウントドラッグ コスモス北山店',
    englishName: 'Cosmos Kitayama',
    lngLat: [135.70319963, 34.84109702],
    desc: 'キャンパスからすぐ近く、学生や地域住民の生活を支える大型ドラッグストア。',
    quiz: {
      q: 'ディスカウントドラッグコスモスの看板でお馴染みのシンボルカラーは何色？',
      choices: ['ピンク（桃色）', 'グリーン（緑色）', 'ブルー（青色）', 'イエロー（黄色）'],
      ans: 0
    }
  },
  {
    id: 'oni-park',
    name: '王仁公園（おにこうえん）',
    englishName: 'Oni Park',
    lngLat: [135.70689959, 34.81798706],
    desc: 'テニスコートやプール、広大な緑地を備えた枚方市東部の総合公園。',
    quiz: {
      q: '王仁公園の名前の由来となった「王仁（わに）」は、歴史上何をもたらしたとされる人物？',
      choices: ['論語や千字文（漢字・学問）', '米づくり技術', '鉄器の製法', '仏教の経典'],
      ans: 0
    }
  },
  {
    id: 'nagao-station',
    name: 'JR学研都市線 長尾駅',
    englishName: 'Nagao Station',
    lngLat: [135.71338092, 34.82614819],
    desc: '枚方キャンパスへのアクセス拠点となる学研都市線の主要駅。',
    quiz: {
      q: 'JR長尾駅が属する「学研都市線」の正式名称は次のうちどれ？',
      choices: ['片町線', '東西線', '関西本線', '奈良線'],
      ans: 0
    }
  },
  {
    id: 'kitayama-park',
    name: '北山公園',
    englishName: 'Kitayama Park',
    lngLat: [135.70288823, 34.84491044],
    desc: '北山住宅地に隣接し、緑豊かで休憩や散歩にぴったりの憩いの公園。',
    quiz: {
      q: '枚方市が発祥・名物として推進している「枚方市のお花」は次のうちどれ？',
      choices: ['菊（キク）', '桜（サクラ）', 'チューリップ', '梅（ウメ）'],
      ans: 0
    }
  },
  {
    id: 'zouheikyoku',
    name: '造幣局',
    englishName: 'zouheikyoku',
    lngLat: [135.52109882, 34.69657722],
    desc: '旧淀川沿いに位置し、「桜の通り抜け」や貨幣博物館で有名な歴史ある施設。',
    quiz: {
      q: '造幣局で毎年春に開催される、約140品種の桜が鑑賞できる有名なイベントは？',
      choices: ['桜の通り抜け', '花見大祭', '春の貨幣市', '淀川桜まつり'],
      ans: 0
    }
  },
  {
    id: 'fujita-museum',
    name: '藤田美術館',
    englishName: 'Fujita Museum',
    lngLat: [135.52523504, 34.69488582],
    desc: '明治の実業家・藤田伝三郎らのコレクションを収蔵。国宝・曜変天目茶碗などを所蔵する歴史ある美術館。',
    quiz: {
      q: '藤田美術館が所蔵する、世界に数点しか現存しない国宝の茶碗はどれ？',
      choices: ['曜変天目茶碗', '油滴天目茶碗', '井戸茶碗', '志野茶碗'],
      ans: 0
    }
  },
  {
    id: 'osaka-castle',
    name: '大阪城',
    englishName: 'Osaka Castle',
    lngLat: [135.52585207, 34.68724701],
    desc: '豊臣秀吉によって築城された大阪のシンボル。天守閣からは大阪の街並みを一望できます。',
    quiz: {
      q: '大阪城を最初に築城した戦国武将は誰でしょう？',
      choices: ['豊臣秀吉', '徳川家康', '織田信長', '武田信玄'],
      ans: 0
    }
  },
  {
    id: 'hachikenya-pier',
    name: '八軒家浜船着場(川の駅はちけんや)',
    englishName: 'Hachikenya Pier',
    lngLat: [135.51458163, 34.69054421],
    desc: '平安時代から水運の拠点として栄えた歴史ある港。現在は水上バスの発着場やレストスペースが整備されています。',
    quiz: {
      q: '八軒家浜船着場が、かつて熊野詣（熊野古道）の陸路への乗り換え拠点として最も賑わった時代はいつでしょう？',
      choices: ['平安時代', '室町時代', '明治時代', '大正時代'],
      ans: 0
    }
  },
  {
    id: 'tenjinbashi-bridge',
    name: '天神橋',
    englishName: 'Tenjinbashi Bridge',
    lngLat: [135.51177559, 34.6913756],
    desc: '浪華三大橋の一つ。中之島公園の東端を横断し、旧淀川（大川）に架かる歴史ある橋です。',
    quiz: {
      q: '天神橋・難波橋と共に「浪華三大橋（なにわさんだいきょう）」に数えられる、残るもう一つの橋はどれでしょう？',
      choices: ['天満橋', '淀屋橋', '日本橋', '心斎橋'],
      ans: 0
    }
  },
  {
    id: 'oie-bridge',
    name: '大江橋',
    englishName: 'Oie Bridge',
    lngLat: [135.50110245, 34.69389403],
    desc: '御堂筋に架かる堂島川の橋。対となる淀屋橋と共に、美しいデザインで国の重要文化財に指定されています。',
    quiz: {
      q: '大江橋とデザインが対（ツイン）になっており、共に国の重要文化財に指定されている土佐堀川の橋はどれ？',
      choices: ['淀屋橋', '天神橋', '難波橋', '肥後橋'],
      ans: 0
    }
  },
  {
    id: 'oriental-ceramics-museum',
    name: '大阪市立東洋陶磁美術館',
    englishName: 'Museum of Oriental Ceramics, Osaka',
    lngLat: [135.50548299, 34.69340973],
    desc: '中之島公園内に位置し、安宅コレクョンをはじめとする世界最高峰の東洋陶磁器を収蔵する美術館。',
    quiz: {
      q: '大阪市立東洋陶磁美術館に収蔵されている、中国・宋時代の国宝の茶碗はどれでしょう？',
      choices: ['油滴天目茶碗', '曜変天目茶碗', '井戸茶碗', '黒楽茶碗'],
      ans: 0
    }
  },
];

// Illustration paths gare kept as simple public paths so real artwork can be
// dropped in later without changing the card components.
const EDO_NAMES = {
  'nakanishima-park': '中之島',
  'osaka-castle-pier': '大坂城',
  'zouheikyoku': '川崎村（造幣局周辺）',
  'osaka-castle': '大坂城',
  'hachikenya-pier': '八軒家浜',
  'tenjinbashi-bridge': '天神橋',
  'oie-bridge': '大江橋',
  'oriental-ceramics-museum': '中之島',
};

export const SPOTS_DATA = SPOTS_BASE_DATA.map((spot, index) => ({
  ...spot,
  edoName: EDO_NAMES[spot.id] || '—',
  ukiyoeImage: `/images/ukiyoe/${({
    'central-hall': 'central-hall.jpg',
    'cosmos-kitayama': 'cosmos-kitayama.jpg',
    'fujita-museum': 'fujita-museum.jpg',
    'kitayama-park': 'kitayama-park.jpg',
    'nakanishima-park': 'nakanishima-park.jpg',
    'oit-hirakata': 'oit-hirakata.jpg',
    'osaka-castle-pier': 'osaka-castle-pier.jpg',
    zouheikyoku: 'zouheikyoku.jpg',
  })[spot.id] || `${spot.id}.svg`}`,
  trivia: `${spot.name}は、大阪の水辺の歴史と人々の暮らしを今に伝える場所です。周辺の町並みや水運の記憶にも目を向けてみましょう。`,
  spotNumber: index + 1,
}));
