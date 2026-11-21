// 文件路径: plugin/tech-data.js
// 科技树数据：三条路线（标准文明 / 魔法穿越 / 古代中国穿越）+ 政体适配
// 每个节点：name 名称 / icon 图标 / short 一句话 / desc 是什么 / why 为什么这时候做
//           tip 什么时候该点 / impact 对世界的影响 / year 现实参照 / needs 前置
window.TECH_ROUTES = [
  // ==================== 一、标准文明线 ====================
  {
    id: 'standard',
    name: '标准文明线',
    icon: '🌍',
    desc: '从石器到信息时代，人类历史的主干',
    eras: [
      {
        id: 'stone', name: '石器时代', icon: '🪨', year: '约前 300 万年 – 前 3000 年',
        politics: '部落议事会',
        nodes: [
          { id: 'fire', name: '火的使用', icon: '🔥', short: '取暖、照明、驱兽', year: '约前 100 万年',
            desc: '掌握自然火并保存火种，后来学会钻木取火。',
            why: '有火才有熟食和夜间活动，这是所有后续文明的地基。',
            tip: '开局的第一个点，没有它其余都不成立。',
            impact: '熟食让大脑发育，夜间成了社交时间。', needs: [] },
          { id: 'stone_tool', name: '打制石器', icon: '🪓', short: '切割、砸击、狩猎', year: '约前 260 万年',
            desc: '把石头敲出刃口，做成砍砸器、刮削器。',
            why: '工具让狩猎效率翻倍，也让人有了改造自然的能力。',
            tip: '和火并行点，工具决定你能否吃到肉。',
            impact: '人类第一次制造工具，也第一次有了「技术」这个概念。', needs: [] },
          { id: 'language', name: '语言', icon: '💬', short: '协作与传承', year: '约前 10 万年',
            desc: '用声音约定意义，能描述不在眼前的事物。',
            why: '语言把经验从一个人传给一群人，是知识积累的前提。',
            tip: '有了语言，后面的文字、教育才可能。',
            impact: '经验可以跨人传递，文明开始「累积」。', needs: ['fire'] },
          { id: 'clothing', name: '兽皮衣物', icon: '🧥', short: '御寒、迁徙', year: '约前 20 万年',
            desc: '剥制兽皮缝制衣物，抵御寒冷。',
            why: '能御寒才能走出温暖地带，人类因此扩散到全球。',
            tip: '要迁徙到冷的地方之前必须点。',
            impact: '人类扩散到寒带，族群开始分化。', needs: ['stone_tool'] },
          { id: 'hunting', name: '集体狩猎', icon: '🏹', short: '围猎大型动物', year: '约前 50 万年',
            desc: '多人配合驱赶、包围、伏击猎物。',
            why: '大型猎物需要协作，协作催生更复杂的社会结构。',
            tip: '人多了再点，单打独斗效率低。',
            impact: '协作出现，为部落组织打底。', needs: ['stone_tool'] },
          { id: 'pottery', name: '陶器', icon: '🏺', short: '储存、煮食', year: '约前 1.8 万年',
            desc: '用黏土塑形烧制容器，能装水、存粮、煮东西。',
            why: '有了容器才能储存余粮，才有定居的可能。',
            tip: '准备定居前点，是农业的前置。',
            impact: '能存粮了，人才敢在一个地方住下来。', needs: ['fire'] },
          { id: 'agriculture', name: '农业', icon: '🌾', short: '种植、定居', year: '约前 9000 年',
            desc: '驯化小麦、水稻等作物，按季节耕种。',
            why: '农业让单位土地养活更多人，是文明跃迁的起点。',
            tip: '这是石器时代最重要的一步，点完就该进入青铜时代。',
            impact: '人口暴涨，村庄变城镇，阶级开始出现。', needs: ['pottery', 'stone_tool'] },
          { id: 'animal_husbandry', name: '畜牧', icon: '🐑', short: '驯养家畜', year: '约前 8000 年',
            desc: '驯化羊、牛、猪，获得肉、奶、毛皮和畜力。',
            why: '牲畜是活的生产资料，还能拉犁、驮运。',
            tip: '和农业同期点，能大幅提升产出。',
            impact: '牲畜成了财富的计量单位。', needs: ['hunting', 'agriculture'] },
          { id: 'weaving', name: '编织', icon: '🧶', short: '纺织、绳索', year: '约前 8000 年',
            desc: '用植物纤维和羊毛编成布料与绳索。',
            why: '绳索与帆布是后来造船、建筑的前提。',
            tip: '有畜牧之后顺手点，为帆船铺路。',
            impact: '有了绳索和布，才谈得上大工程和航行。', needs: ['clothing'] }
        ]
      },
      {
        id: 'bronze', name: '青铜时代', icon: '⚒️', year: '约前 3300 – 前 1200 年',
        politics: '城邦 / 神权王权',
        nodes: [
          { id: 'smelting', name: '冶炼', icon: '🔥', short: '从矿石里取出金属', year: '约前 5000 年',
            desc: '高温还原铜矿石，得到可锻造的金属。',
            why: '金属工具彻底改变农业和战争效率。',
            tip: '陶器（能耐火）是它的前提，别跳过陶器。',
            impact: '出现专职工匠，手艺开始世袭。', needs: ['pottery', 'fire'] },
          { id: 'bronze_tool', name: '青铜工具', icon: '⚔️', short: '更硬的农具与武器', year: '约前 3300 年',
            desc: '铜锡合金，硬度远超石器。',
            why: '青铜犁能翻更硬的土地，粮产上去了人口才涨。',
            tip: '冶炼点完立刻点，收益最直接。',
            impact: '武器代差出现，战争从混战变成组织化。', needs: ['smelting'] },
          { id: 'writing', name: '文字', icon: '📜', short: '记账、记事、律法', year: '约前 3200 年',
            desc: '用符号记录语言，最早是账目和祭祀记录。',
            why: '没有文字，知识只能靠记忆，跨代积累会断。',
            tip: '人口过千、开始收税时就必须点。',
            impact: '历史开始被记录，官僚系统有了工具。', needs: ['language'] },
          { id: 'wheel', name: '车轮', icon: '🛞', short: '运输、制陶、战争', year: '约前 3500 年',
            desc: '轮轴结构，用于车与陶轮。',
            why: '运输效率决定贸易半径，也决定军队能走多远。',
            tip: '有了剩余物资要运出去时点。',
            impact: '运输半径扩大，市场开始成形。', needs: ['stone_tool'] },
          { id: 'irrigation', name: '灌溉', icon: '💧', short: '引水、防洪', year: '约前 3200 年',
            desc: '开渠引水、筑堤防洪，让农田不靠天吃饭。',
            why: '灌溉让产量稳定，是养活城市的前提。',
            tip: '定居点靠近河流时优先点。',
            impact: '需要组织大量人力，集权因此有了理由。', needs: ['agriculture'] },
          { id: 'calendar', name: '历法', icon: '📅', short: '定季节、排农时', year: '约前 3000 年',
            desc: '观测日月星辰，制定季节与月份。',
            why: '农业需要知道什么时候播种，历法把经验变成制度。',
            tip: '农业规模变大后点，否则播种全靠猜。',
            impact: '历法 = 权力：谁掌握时间，谁就掌握祭祀与税收。', needs: ['writing', 'agriculture'] },
          { id: 'city', name: '城邦', icon: '🏙️', short: '人口聚集、分工', year: '约前 3000 年',
            desc: '城墙、市场、神庙、行政机构出现。',
            why: '城市让分工成为可能：有人专门打铁、写字、打仗。',
            tip: '粮食有余、有文字后就能点，是文明成型的标志。',
            impact: '职业分化，出现了不事生产的阶层。', needs: ['irrigation', 'writing', 'bronze_tool'] },
          { id: 'sail', name: '帆船', icon: '⛵', short: '风帆、海运', year: '约前 3000 年',
            desc: '用帆借风力航行，比划桨省力得多。',
            why: '海运成本远低于陆运，能撑起远距离贸易。',
            tip: '有海岸线或大河时点，贸易收入翻倍。',
            impact: '沿海文明靠贸易暴富，内陆文明被拉开差距。', needs: ['weaving', 'wheel'] }
        ]
      },
      {
        id: 'iron', name: '铁器时代', icon: '🗡️', year: '约前 1200 – 公元 1700 年',
        politics: '封建分封 / 中央集权',
        nodes: [
          { id: 'iron', name: '冶铁', icon: '🔩', short: '更高温度、更硬金属', year: '约前 1200 年',
            desc: '把炉温提到 1200℃ 以上，冶炼铁矿石。',
            why: '铁矿遍地都是，铁器让工具和武器普及到平民。',
            tip: '青铜时代后期必须点，否则会被铁器文明碾压。',
            impact: '平民也能有铁农具，贵族垄断被打破。', needs: ['bronze_tool', 'smelting'] },
          { id: 'plow', name: '铁犁', icon: '🚜', short: '深耕、开荒', year: '约前 1000 年',
            desc: '铁制犁铧配畜力，能翻动黏重土壤。',
            why: '可耕地大幅增加，是人口增长的直接推手。',
            tip: '有畜牧和冶铁后立刻点，性价比最高。',
            impact: '人口翻倍，土地成了最值钱的资源。', needs: ['iron', 'animal_husbandry'] },
          { id: 'currency', name: '货币', icon: '🪙', short: '统一价值尺度', year: '约前 700 年',
            desc: '标准化金属铸币，替代以物易物。',
            why: '货币让交易可以跨时间、跨地域，市场才真正形成。',
            tip: '贸易变复杂时点，别一直以物易物。',
            impact: '出现商人阶层，以及「借钱收利息」这件事。', needs: ['writing', 'smelting'] },
          { id: 'road', name: '道路', icon: '🛣️', short: '驿道、行军、商路', year: '约前 500 年',
            desc: '硬化路面、桥梁、驿站体系。',
            why: '道路决定行政效率：政令能多快到达边疆。',
            tip: '疆域变大后点，否则管不住远方。',
            impact: '中央能管到边疆，帝国成为可能。', needs: ['wheel'] },
          { id: 'paper', name: '造纸', icon: '📄', short: '廉价书写材料', year: '公元 105 年',
            desc: '用树皮、麻头、破布造纸，成本远低于丝帛与羊皮。',
            why: '书写材料便宜，知识才能大规模复制。',
            tip: '文字用量大、但载体太贵时点。',
            impact: '书变便宜，读书人变多，官僚队伍扩大。', needs: ['writing'] },
          { id: 'printing', name: '印刷', icon: '🖨️', short: '批量复制知识', year: '公元 1040 年',
            desc: '雕版与活字印刷，一本书可以印几百册。',
            why: '知识复制成本骤降，直接催生后来的科学革命。',
            tip: '造纸之后点，两者合起来才是质变。',
            impact: '思想开始批量传播，宗教与政令都靠它扩散。', needs: ['paper'] },
          { id: 'gunpowder', name: '火药', icon: '💥', short: '火器、爆破、采矿', year: '公元 850 年',
            desc: '硝石、硫磺、木炭配比，产生爆燃。',
            why: '火药让城墙失效，军事格局被彻底改写。',
            tip: '有冶铁和造纸后点，但注意它会打破旧秩序。',
            impact: '城堡不再是绝对防御，骑士阶层衰落。', needs: ['iron', 'paper'] },
          { id: 'compass', name: '指南针', icon: '🧭', short: '远洋定向', year: '公元 1040 年',
            desc: '磁针指向，能在看不到陆地时辨别方向。',
            why: '没有定向手段，远洋航行就是自杀。',
            tip: '要出海远航前点。',
            impact: '远洋航行成为可能，世界地图被重画。', needs: ['iron', 'sail'] },
          { id: 'aqueduct', name: '水利工程', icon: '🌉', short: '供水、运河、防洪', year: '约前 300 年',
            desc: '高架渠、船闸、水库，把水调到需要的地方。',
            why: '大城市和工业都需要稳定供水与运输水道。',
            tip: '城市人口上万后点，否则水源会成为瓶颈。',
            impact: '大城市能存在，且需要专业官僚管理。', needs: ['irrigation', 'iron'] },
          { id: 'science', name: '科学方法', icon: '🔬', short: '观察、实验、可重复', year: '公元 1600 年',
            desc: '用实验验证假设，结论可被他人重复。',
            why: '这是从经验到知识体系的转折点，后面所有技术都靠它。',
            tip: '印刷普及、识字率上来后点，早了没土壤。',
            impact: '知识不再靠权威，而靠验证——这是现代的开端。', needs: ['printing'] }
        ]
      },
      {
        id: 'steam', name: '蒸汽时代', icon: '🚂', year: '约 1760 – 1870 年',
        politics: '君主立宪 / 技术官僚',
        nodes: [
          { id: 'steam_engine', name: '蒸汽机', icon: '⚙️', short: '把热能变机械能', year: '1712 / 1769 年',
            desc: '用蒸汽推动活塞，第一次让机器不依赖人力畜力水力。',
            why: '这是人类第一次掌握可移动的大功率动力，工业革命的引擎。',
            tip: '冶铁 + 科学方法齐了再点，早了造不出密封气缸。',
            impact: '工厂不再必须建在河边，城市形态被改写。', needs: ['iron', 'science'] },
          { id: 'coal', name: '煤炭开采', icon: '⛏️', short: '高密度燃料', year: '1700 年代',
            desc: '深层采煤、排水、运输。',
            why: '木柴撑不起蒸汽机，煤是工业的粮食。',
            tip: '蒸汽机之前就该准备，燃料是瓶颈。',
            impact: '能源密集化，也带来第一次大规模污染。', needs: ['steam_engine'] },
          { id: 'factory', name: '工厂制度', icon: '🏭', short: '集中生产、分工', year: '1770 年代',
            desc: '机器集中在一处，工人按时上下班。',
            why: '工厂让产量指数级上升，也重塑了社会结构。',
            tip: '蒸汽机稳定后点，是城市化的推手。',
            impact: '出现工人阶级与劳资矛盾。', needs: ['steam_engine'] },
          { id: 'railway', name: '铁路', icon: '🚆', short: '陆运速度 ×10', year: '1825 年',
            desc: '蒸汽机车 + 铁轨，实现全天候大批量陆运。',
            why: '运输成本骤降，市场从本地变成全国。',
            tip: '有蒸汽机和道路后点，是统一市场的关键。',
            impact: '全国市场形成，地方方言和地方势力被削弱。', needs: ['steam_engine', 'road'] },
          { id: 'steamship', name: '蒸汽船', icon: '🚢', short: '不靠风也能走', year: '1807 年',
            desc: '蒸汽动力螺旋桨，摆脱风向限制。',
            why: '航运定时定点，跨洋贸易和殖民扩张加速。',
            tip: '有帆船和蒸汽机后点。',
            impact: '远洋变得可预测，全球贸易体系成型。', needs: ['steam_engine', 'sail'] },
          { id: 'telegraph', name: '电报', icon: '📡', short: '信息瞬间传递', year: '1844 年',
            desc: '电信号沿导线传输，实现远距离即时通信。',
            why: '第一次让信息快于人，指挥与市场同步。',
            tip: '有科学方法和货币后点。',
            impact: '中央政府第一次能实时指挥远方。', needs: ['science', 'currency'] }
        ]
      },
      {
        id: 'electric', name: '电气时代', icon: '⚡', year: '约 1870 – 1950 年',
        politics: '代议制共和 / 联邦制',
        nodes: [
          { id: 'electricity', name: '电学', icon: '🔌', short: '电的本质与规律', year: '1831 年',
            desc: '电磁感应、电路理论，把电变成可控能源。',
            why: '电可以远距离输送、精确控制，是第二次工业革命的核心。',
            tip: '科学方法成熟后点，先有理论再谈应用。',
            impact: '能源可以输送到任何地方，工厂选址自由了。', needs: ['science'] },
          { id: 'generator', name: '发电机', icon: '🔋', short: '持续供电', year: '1866 年',
            desc: '把机械能转成电能，配合电网输送。',
            why: '有了电，工厂可以摆脱必须挨着蒸汽机的限制。',
            tip: '电学点完马上点，不然电只是实验室玩具。',
            impact: '电网出现，能源变成公共服务。', needs: ['electricity', 'steam_engine'] },
          { id: 'light', name: '电灯', icon: '💡', short: '照明、夜生活', year: '1879 年',
            desc: '白炽灯把夜晚变成可工作的时段。',
            why: '照明延长了生产与学习时间，城市变得更安全。',
            tip: '有发电机后点，是最早的民用电应用。',
            impact: '夜晚被点亮，作息和社会生活彻底改变。', needs: ['generator'] },
          { id: 'telephone', name: '电话', icon: '☎️', short: '实时语音', year: '1876 年',
            desc: '声音转电信号，实现双向实时通话。',
            why: '即时沟通让组织效率再上一个台阶。',
            tip: '电报 + 电学之后点。',
            impact: '远程协作成为日常，企业可以跨城市管理。', needs: ['telegraph', 'electricity'] },
          { id: 'radio', name: '无线电', icon: '📻', short: '不用线的通信', year: '1895 年',
            desc: '电磁波传输信息，摆脱导线束缚。',
            why: '对船、飞机、军队来说，这是唯一可行的远程通信。',
            tip: '有电学和电报后点，是后面移动通信的根。',
            impact: '大众传媒诞生，宣传与舆论成为力量。', needs: ['electricity', 'telegraph'] },
          { id: 'car', name: '内燃机汽车', icon: '🚗', short: '个人机动交通', year: '1886 年',
            desc: '内燃机 + 底盘，取代马车成为主要交通工具。',
            why: '交通从轨道变成任意路线，城市形态被改写。',
            tip: '有蒸汽机和煤后点。',
            impact: '郊区出现，城市开始向外摊大饼。', needs: ['steam_engine', 'coal'] },
          { id: 'plane', name: '飞机', icon: '✈️', short: '三维交通', year: '1903 年',
            desc: '可控动力飞行，跨越地形限制。',
            why: '远程投送从周缩短到小时。',
            tip: '有汽车后点。',
            impact: '世界变小，战争也第一次能打到后方城市。', needs: ['car'] },
          { id: 'assembly', name: '流水线', icon: '🔧', short: '标准化量产', year: '1913 年',
            desc: '工序拆分、节拍化生产。',
            why: '单件成本大幅下降，商品从奢侈品变成日用品。',
            tip: '工厂 + 电力齐了再点。',
            impact: '消费社会出现，人也开始被当成零件。', needs: ['factory', 'electricity'] }
        ]
      },
      {
        id: 'info', name: '信息时代', icon: '💻', year: '1950 年 – 现在',
        politics: '网络化治理 / 技术寡头',
        nodes: [
          { id: 'computer', name: '电子计算机', icon: '🖥️', short: '可编程计算', year: '1946 年',
            desc: '用电子器件执行指令，取代人力和机械计算。',
            why: '计算能力是一切信息技术的底座。',
            tip: '有电学和无线电后点。',
            impact: '复杂计算从人工变成机器，科学加速。', needs: ['electricity', 'radio'] },
          { id: 'transistor', name: '晶体管', icon: '🔲', short: '更小更快的开关', year: '1947 年',
            desc: '用半导体替代电子管，体积骤减、可靠性提高。',
            why: '没有晶体管就没有现代芯片，计算机也进不了家庭。',
            tip: '计算机点完紧接着点，性价比最高的一步。',
            impact: '电子设备小型化，计算进入日常生活。', needs: ['computer'] },
          { id: 'internet', name: '互联网', icon: '🌐', short: '全球互联', year: '1969 年',
            desc: '分组交换网络，把分散的计算机连成一张网。',
            why: '信息复制与传播成本趋近于零，协作方式被重写。',
            tip: '有计算机和电话后点。',
            impact: '信息垄断被打破，也出现了新的信息垄断。', needs: ['computer', 'telephone'] },
          { id: 'mobile', name: '移动通信', icon: '📱', short: '随时在线', year: '1973 年',
            desc: '蜂窝网络让人脱离固定线路。',
            why: '信息接入从到某个地方变成随时随地。',
            tip: '无线电 + 互联网后点。',
            impact: '工作与生活边界消失，永远在线。', needs: ['radio', 'internet'] },
          { id: 'satellite', name: '人造卫星', icon: '🛰️', short: '全球定位与通信', year: '1957 年',
            desc: '把设备送入轨道，实现全球覆盖。',
            why: '定位、气象、通信都靠它，是国家级基础设施。',
            tip: '有飞机和无线电后点。',
            impact: '全球定位让导航、测绘、军事精确化。', needs: ['plane', 'radio'] },
          { id: 'renewable', name: '新能源', icon: '🌞', short: '光伏、风电、储能', year: '2000 年代',
            desc: '把太阳能、风能转成电，替代化石燃料。',
            why: '化石燃料有限且污染，可持续发展必须转新能源。',
            tip: '发电体系成熟、能源成为瓶颈时点。',
            impact: '能源从集中变为分布式，地缘格局松动。', needs: ['generator', 'science'] },
          { id: 'genome', name: '基因工程', icon: '🧬', short: '改造生命', year: '1973 年',
            desc: '直接编辑 DNA，改造作物、药物与人体。',
            why: '医学和农业从碰运气变成可设计。',
            tip: '计算机 + 科学方法后点。',
            impact: '寿命延长，也带来伦理边界问题。', needs: ['science', 'computer'] },
          { id: 'ai', name: '人工智能', icon: '🤖', short: '机器替代脑力', year: '2010 年代',
            desc: '用算力和数据训练模型，完成识别、生成、决策。',
            why: '第一次让机器承担认知劳动，影响远超工业革命。',
            tip: '互联网 + 晶体管齐了才点得动。',
            impact: '知识工作被重构，真假难辨成为常态。', needs: ['internet', 'transistor'] }
        ]
      }
    ]
  },

  // ==================== 二、魔法穿越线 ====================
  {
    id: 'magic',
    name: '魔法穿越线',
    icon: '🔮',
    desc: '穿越到一个有魔力的异世界，从感知元素到浮空城',
    eras: [
      {
        id: 'magic_awake', name: '苏醒期', icon: '✨', year: '第 1 – 3 年',
        politics: '村落自治',
        nodes: [
          { id: 'element_sense', name: '元素感知', icon: '👁️', short: '看见魔力流动', year: '第 1 月',
            desc: '学会用内在感官分辨地水火风等元素的浓度。',
            why: '这是一个有魔力世界的入场券，没有感知就永远是普通人。',
            tip: '醒来后的第一件事，先静坐感知。',
            impact: '从凡人变成施法者的分水岭。', needs: [] },
          { id: 'mana_core', name: '魔力回路', icon: '🌀', short: '体内循环魔力', year: '第 3 月',
            desc: '打通体内魔力循环，形成可蓄能的核心。',
            why: '没有回路，魔力用完就是废人。',
            tip: '感知之后才能构建，别硬冲。',
            impact: '有了持续施法能力，不再是天赋碰运气。', needs: ['element_sense'] },
          { id: 'basic_spell', name: '基础咒语', icon: '🔤', short: '可重复的小法术', year: '第 6 月',
            desc: '掌握照明、点火、短距意念移物等低耗法术。',
            why: '把魔力变成可复现的工具，才是科技的起点。',
            tip: '越简单的咒语越要练熟，后面全靠它打工。',
            impact: '日常劳作效率提升，你开始被当成「有用的人」。', needs: ['mana_core'] },
          { id: 'magic_literacy', name: '魔法识文', icon: '📖', short: '读懂符文', year: '第 1 年',
            desc: '学会阅读基础符文语言，理解法师文献。',
            why: '不能读文献就只能自学，永远追不上体系化文明。',
            tip: '拜师或以物易书，这是最划算的一笔投资。',
            impact: '从野路子进入知识传承体系。', needs: ['basic_spell'] },
          { id: 'magic_body', name: '魔导体质', icon: '💪', short: '强化肉身', year: '第 2 年',
            desc: '用魔力强化肌肉与恢复力，能承担更强的法术反噬。',
            why: '法师最大的敌人是反噬，不是敌人。',
            tip: '身体跟不上，法术再强也会把自己烧了。',
            impact: '能承受高阶法术，生命危险下降。', needs: ['mana_core'] },
          { id: 'tool_craft', name: '法器制作', icon: '🔧', short: '用材料放大魔力', year: '第 3 年',
            desc: '制作法杖、魔晶道具，减少施法消耗。',
            why: '人肉施法效率低，工具才是文明的加速器。',
            tip: '有基础咒语和材料后就能试，越早越好。',
            impact: '法术可复制，普通人也能用道具施法。', needs: ['basic_spell'] }
        ]
      },
      {
        id: 'magic_apprentice', name: '学徒期', icon: '🧙', year: '第 3 – 10 年',
        politics: '学院制',
        nodes: [
          { id: 'magic_array', name: '魔法阵', icon: '⛩️', short: '把咒语刻成流程', year: '第 3 年',
            desc: '用几何阵列固化法术结构，可重复触发。',
            why: '这是魔法世界的「标准化生产」，是质变点。',
            tip: '学会阵图后，法术不再依赖你一个人。',
            impact: '魔法从手艺变成可复制的工业品。', needs: ['magic_literacy', 'tool_craft'] },
          { id: 'alchemy', name: '炼金术', icon: '⚗️', short: '物质转化', year: '第 4 年',
            desc: '用魔力改变物质结构，提炼药剂与材料。',
            why: '材料是魔法的粮食，炼金让你有稳定供给。',
            tip: '和魔法阵同时点，两者互相喂养。',
            impact: '出现能够批量造材的「化工厂」。', needs: ['magic_literacy'] },
          { id: 'potion', name: '魔药', icon: '🧪', short: '治疗、强化', year: '第 5 年',
            desc: '把魔力封进药剂，非施法者也能使用。',
            why: '让普通人受益，才有市场与和平。',
            tip: '有炼金基础后点，能把魔法卖成日用品。',
            impact: '医疗革命，人均寿命延长。', needs: ['alchemy'] },
          { id: 'enchant', name: '附魔', icon: '⚔️', short: '给器物加属性', year: '第 6 年',
            desc: '把法术刻进武器防具，长期生效。',
            why: '装备决定军队上限，是战争的关键。',
            tip: '魔法阵 + 法器制作后点。',
            impact: '战争形态改变，装备代差决定胜负。', needs: ['magic_array', 'tool_craft'] },
          { id: 'portal', name: '传送门', icon: '🚪', short: '点对点移动', year: '第 8 年',
            desc: '建立空间通道，人和货物可瞬时转移。',
            why: '物流是魔法世界最大的限制，传送门直接解决。',
            tip: '魔法阵成熟后点，要注意能耗与坐标。',
            impact: '地理屏障失效，全球市场成为可能。', needs: ['magic_array'] },
          { id: 'magic_school', name: '魔法学院', icon: '🏫', short: '体系化传承', year: '第 10 年',
            desc: '建立课程、评级与考核体系。',
            why: '没有学院，知识就断在少数天才手里。',
            tip: '有识文与阵法后建院，能规模化培养法师。',
            impact: '法师从稀缺品变成可培养的职业群体。', needs: ['magic_literacy', 'magic_array'] }
        ]
      },
      {
        id: 'magic_academy', name: '学院期', icon: '🏛️', year: '第 10 – 30 年',
        politics: '法师议会 / 学院自治',
        nodes: [
          { id: 'element_fuse', name: '元素融合', icon: '🌪️', short: '复合法术', year: '第 12 年',
            desc: '把两种以上元素结合，生成新的效果。',
            why: '单元素法术很快会遇到瓶颈。',
            tip: '基础扎实后再尝试，失败会反噬。',
            impact: '魔法类型爆炸式增长，学科开始分化。', needs: ['magic_array', 'magic_body'] },
          { id: 'mana_grow', name: '魔力作物', icon: '🌿', short: '培育高魔力植物', year: '第 15 年',
            desc: '改良植物，使其能蓄积魔力。',
            why: '魔力也需要农业，否则一切靠掠夺。',
            tip: '有炼金与魔药后点，是能源革命的第一步。',
            impact: '魔力可以种植，法师阶层不再是唯一能源持有者。', needs: ['alchemy', 'potion'] },
          { id: 'golem', name: '魔像', icon: '🗿', short: '可编程劳动力', year: '第 18 年',
            desc: '给无机材料赋予指令跟随能力。',
            why: '生产力不足是所有文明的天花板。',
            tip: '需要魔法阵 + 附魔 + 炼金三者齐备。',
            impact: '劳动力不再稀缺，社会结构被颠覆。', needs: ['enchant', 'alchemy', 'magic_array'] },
          { id: 'mana_crystal', name: '魔晶能源', icon: '💎', short: '可储存的魔力电池', year: '第 20 年',
            desc: '把魔力压缩进晶体，可运输、可买卖。',
            why: '能源必须能储存和运输，才能工业化。',
            tip: '魔力作物 + 魔法阵后点，这是魔法世界的煤。',
            impact: '能源成为商品，出现矿业与贸易网络。', needs: ['mana_grow', 'magic_array'] },
          { id: 'magic_engine', name: '魔力机械', icon: '⚙️', short: '以魔晶驱动', year: '第 22 年',
            desc: '用魔晶驱动机械，取代人力和畜力。',
            why: '这是魔法世界的蒸汽机，一次性解决动力问题。',
            tip: '魔晶 + 魔像后点。',
            impact: '出现工厂，城市化加速。', needs: ['mana_crystal', 'golem'] },
          { id: 'magic_medicine', name: '治愈魔法体系', icon: '❤️', short: '标准化治疗', year: '第 25 年',
            desc: '把治疗法术分级、标准化，可批量施救。',
            why: '医疗水平直接决定人口与军队规模。',
            tip: '魔药 + 学院后点。',
            impact: '死亡率骤降，人口结构改变。', needs: ['potion', 'magic_school'] }
        ]
      },
      {
        id: 'magic_industry', name: '魔法工业期', icon: '🏭', year: '第 30 – 80 年',
        politics: '技术官僚 / 帝国',
        nodes: [
          { id: 'airship', name: '浮空艇', icon: '🛩️', short: '空中运输', year: '第 35 年',
            desc: '用反重力阵让大型载具升空。',
            why: '地面被地形和国界限制，天空没有。',
            tip: '魔力机械 + 传送门后点。',
            impact: '远程运输与作战三维化。', needs: ['magic_engine', 'portal'] },
          { id: 'mana_grid', name: '魔网', icon: '🕸️', short: '魔力输送网', year: '第 40 年',
            desc: '用导魔材料铺设网络，把魔晶能量送到各处。',
            why: '没有配送网络，魔晶只是富人的玩具。',
            tip: '魔晶与魔力机械齐备后建网。',
            impact: '能源普惠，偏远地区也能用魔法设备。', needs: ['mana_crystal', 'magic_engine'] },
          { id: 'mass_enchant', name: '量产附魔', icon: '🏗️', short: '流水线造法具', year: '第 45 年',
            desc: '把附魔拆成工序，用魔像批量生产。',
            why: '手工作坊撑不起战争与民用需求。',
            tip: '魔像 + 附魔 + 魔网后点。',
            impact: '法具变成日用品，平民生活水平抬升。', needs: ['golem', 'enchant', 'mana_grid'] },
          { id: 'magic_bio', name: '魔物培育', icon: '🐉', short: '造出可用的魔兽', year: '第 50 年',
            desc: '用炼金与基因式手段培育魔物。',
            why: '生物劳动力比机械更便宜，也更危险。',
            tip: '炼金 + 治愈体系后点，注意失控风险。',
            impact: '军事与经济都获得生物红利，伦理争议随之而来。', needs: ['alchemy', 'magic_medicine'] },
          { id: 'space_mana', name: '空间研究', icon: '🌌', short: '多维度观测', year: '第 60 年',
            desc: '系统研究空间结构，发现平行层与裂隙。',
            why: '传送门只是应用，原理才是下一次跃迁。',
            tip: '有传送门与魔网后推进。',
            impact: '世界之外还有世界的认知被确立。', needs: ['portal', 'mana_grid'] }
        ]
      },
      {
        id: 'magic_civ', name: '魔法文明期', icon: '🌆', year: '第 80 年以后',
        politics: '法师共和国 / 神权',
        nodes: [
          { id: 'floating_city', name: '浮空城', icon: '🏰', short: '空中城市', year: '第 80 年',
            desc: '把整座城市托在空中，脱离地面约束。',
            why: '地面资源被瓜分完后，垂直空间成为新大陆。',
            tip: '浮空艇 + 魔网 + 空间研究后建城。',
            impact: '阶级以海拔划分，地面成为底层。', needs: ['airship', 'mana_grid', 'space_mana'] },
          { id: 'immortality', name: '永生术', icon: '♾️', short: '停止衰老', year: '第 100 年',
            desc: '把灵魂或意识固定下来，规避肉体衰亡。',
            why: '知识的积累者如果会死，文明每次都要重来。',
            tip: '治愈体系 + 空间研究后探索，代价很大。',
            impact: '出现长生者阶层，社会流动性骤降。', needs: ['magic_medicine', 'space_mana'] },
          { id: 'artificial_life', name: '人造生命', icon: '🧬', short: '从零造出生命', year: '第 120 年',
            desc: '不依赖已有生命，直接构造有意识的存在。',
            why: '从改造生命到创造生命，是造物主级别的门槛。',
            tip: '魔物培育 + 永生术 + 魔晶后尝试。',
            impact: '谁是人的定义被动摇。', needs: ['magic_bio', 'immortality', 'mana_crystal'] },
          { id: 'world_tree', name: '世界树工程', icon: '🌳', short: '改造整个世界的魔力循环', year: '第 150 年',
            desc: '用巨型法阵重塑大陆的魔力流向。',
            why: '不再改造设备，而是改造世界的底层规则。',
            tip: '浮空城 + 人造生命 + 魔网后启动。',
            impact: '整个大陆的气候与魔力分布被改写。', needs: ['floating_city', 'artificial_life', 'mana_grid'] }
        ]
      }
    ]
  },

  // ==================== 三、中国古代穿越线 ====================
  {
    id: 'china',
    name: '古代中国穿越线',
    icon: '🏮',
    desc: '穿到古代中国，用现代知识少走弯路',
    eras: [
      {
        id: 'cn_preqin', name: '先秦', icon: '🏺', year: '约前 1000 – 前 221 年',
        politics: '分封制 / 变法集权',
        nodes: [
          { id: 'cn_iron_plow', name: '铁农具与牛耕', icon: '🐂', short: '翻地效率翻倍', year: '战国',
            desc: '铁犁配牛耕，深耕细作。',
            why: '粮食是古代一切的基础，先解决吃饭。',
            tip: '穿越后第一件事：找到铁匠，推广铁犁。',
            impact: '井田制瓦解，土地私有化开始。', needs: [] },
          { id: 'cn_water', name: '水利工程', icon: '🌊', short: '都江堰式灌溉', year: '战国',
            desc: '修渠筑堰，引水灌溉兼防洪。',
            why: '靠天吃饭的农业经不起旱涝。',
            tip: '有铁器后修渠，工程量要控制在可完成范围。',
            impact: '一郡可养数十万人口。', needs: ['cn_iron_plow'] },
          { id: 'cn_crossbow', name: '弩机', icon: '🏹', short: '标准化远程武器', year: '战国',
            desc: '带扳机的弩，可预装待发。',
            why: '古代战争靠组织度，弩让人人可战。',
            tip: '有冶铁基础后做，零件要能互换。',
            impact: '平民军队可抗衡贵族武士。', needs: ['cn_iron_plow'] },
          { id: 'cn_philosophy', name: '百家争鸣', icon: '📚', short: '思想市场', year: '春秋战国',
            desc: '儒墨道法等学派竞争，形成治理理论。',
            why: '没有理论支撑的变革会被旧势力反扑。',
            tip: '你要变法，先找到一批能说会写的同路人。',
            impact: '为后来大一统提供制度工具箱。', needs: [] },
          { id: 'cn_measure', name: '统一度量衡', icon: '⚖️', short: '标准化', year: '战国',
            desc: '长度、容量、重量统一，税与工程才可核算。',
            why: '标准不统一，任何大规模协作都会被贪污和误差吃掉。',
            tip: '先在一城推行，成功了再上报。',
            impact: '国家能力上升，为统一市场铺路。', needs: ['cn_philosophy'] }
        ]
      },
      {
        id: 'cn_han', name: '秦汉', icon: '🏯', year: '前 221 – 220 年',
        politics: '郡县制 / 中央集权',
        nodes: [
          { id: 'cn_paper', name: '造纸术', icon: '📄', short: '廉价书写', year: '东汉 105 年',
            desc: '树皮麻头造纸，取代竹简帛书。',
            why: '竹简太贵太重，知识传不开。',
            tip: '穿越者最容易复现的技术之一，成本极低。',
            impact: '识字率上升，官僚与学术都受益。', needs: ['cn_measure'] },
          { id: 'cn_road', name: '驰道与驿站', icon: '🛣️', short: '政令通达', year: '秦',
            desc: '硬化道路 + 驿站换马。',
            why: '中央对地方的控制力 = 通信与运输速度。',
            tip: '有统一度量衡后修路，先修军用再民用。',
            impact: '帝国能管到千里之外。', needs: ['cn_measure'] },
          { id: 'cn_saltiron', name: '盐铁官营', icon: '🧂', short: '国家财政来源', year: '汉',
            desc: '国家垄断盐铁，稳定财政。',
            why: '没有稳定财政，改革撑不过三年。',
            tip: '慎用：能充实国库，也会得罪豪强。',
            impact: '中央财政独立，能养常备军。', needs: ['cn_measure'] },
          { id: 'cn_seismograph', name: '地动仪与天文', icon: '🌐', short: '观测与预警', year: '东汉',
            desc: '观测地震与天象，建立历法体系。',
            why: '古人把天象与政权威望绑定，掌握它就有话语权。',
            tip: '需要长期观测记录，别急着公布结论。',
            impact: '历法与灾害预警成为国家能力。', needs: ['cn_paper'] },
          { id: 'cn_plow2', name: '曲辕犁', icon: '🚜', short: '省力深耕', year: '唐前身',
            desc: '改进犁具，一牛可拉，转弯灵活。',
            why: '南方水田用直犁极难操作，这是南方的钥匙。',
            tip: '到南方后改良，能直接翻倍产量。',
            impact: '江南开发加速，经济重心南移。', needs: ['cn_iron_plow'] }
        ]
      },
      {
        id: 'cn_tang', name: '唐宋', icon: '🏮', year: '618 – 1279 年',
        politics: '三省六部 / 科举官僚',
        nodes: [
          { id: 'cn_print', name: '雕版与活字', icon: '🖨️', short: '知识量产', year: '唐 / 宋',
            desc: '雕版再到活字，书籍成本骤降。',
            why: '印刷是思想传播的加速器。',
            tip: '造纸成熟后立刻做，先印农书与历书。',
            impact: '科举竞争加剧，书籍进入民间。', needs: ['cn_paper'] },
          { id: 'cn_gunpowder', name: '火药', icon: '💥', short: '火器与工程', year: '唐末',
            desc: '硝石硫磺木炭配比，可制爆竹与火器。',
            why: '改变战争，也改变采矿与工程。',
            tip: '配比要反复试，注意安全；先做烟花换钱再做武器。',
            impact: '城墙失效，贵族军事优势被削弱。', needs: ['cn_paper'] },
          { id: 'cn_compass', name: '指南针', icon: '🧭', short: '远洋航海', year: '宋',
            desc: '磁针定向，用于航海。',
            why: '没有定向就无法远洋贸易。',
            tip: '与造船同步推进，海贸利润极高。',
            impact: '海上丝路繁荣，沿海城市兴起。', needs: ['cn_print'] },
          { id: 'cn_ship', name: '水密隔舱造船', icon: '⛵', short: '大船远航', year: '宋',
            desc: '分舱设计，抗沉性强。',
            why: '船造不大，贸易量就上不去。',
            tip: '有指南针和木材来源后建船厂。',
            impact: '远洋船队成为国力象征。', needs: ['cn_compass'] },
          { id: 'cn_water_clock', name: '水运仪象台', icon: '⏰', short: '机械计时', year: '宋',
            desc: '水力驱动的天文钟与浑仪。',
            why: '精确计时是历法、航海、工厂的共同基础。',
            tip: '需要精密工匠，先在都城做一台。',
            impact: '时间标准化，为后来的机械化铺路。', needs: ['cn_print'] },
          { id: 'cn_civil_exam', name: '科举扩招', icon: '🎓', short: '人才流动', year: '宋',
            desc: '扩大取士规模，寒门可入仕。',
            why: '你的改革需要一批忠于制度而非忠于家族的人。',
            tip: '有印刷后推广，书籍便宜才有更多人考得起。',
            impact: '社会流动性上升，士绅结构改变。', needs: ['cn_print'] }
        ]
      },
      {
        id: 'cn_ming', name: '明清', icon: '🏛️', year: '1368 – 1912 年',
        politics: '内阁制 / 君主专制',
        nodes: [
          { id: 'cn_musket', name: '火绳枪与火炮', icon: '🔫', short: '火器部队', year: '明',
            desc: '标准化火器，配合线列战术。',
            why: '火器让训练成本骤降，是军事革命。',
            tip: '有火药和冶铁后做，但要有稳定后勤。',
            impact: '骑兵优势消失，战争进入消耗战。', needs: ['cn_gunpowder'] },
          { id: 'cn_textile', name: '纺织机械', icon: '🧵', short: '飞梭与多锭纺车', year: '明',
            desc: '提高纺纱织布效率。',
            why: '纺织是最早的工业化突破口。',
            tip: '先改良纺车，再考虑水力驱动。',
            impact: '手工业产值暴涨，出现工场。', needs: ['cn_print'] },
          { id: 'cn_map', name: '测绘与地图', icon: '🗺️', short: '精确疆域', year: '清',
            desc: '经纬度测量，绘制全国地图。',
            why: '治理与税收都需要精确地理数据。',
            tip: '需要天文与数学人才，可以与传教士合作。',
            impact: '边疆治理与资源普查能力提升。', needs: ['cn_water_clock'] },
          { id: 'cn_vaccine', name: '人痘接种', icon: '💉', short: '预防天花', year: '明',
            desc: '用弱化的痘痂接种，获得免疫。',
            why: '瘟疫一次能毁掉一座城，防疫是第一民生。',
            tip: '先在民间小范围推广，记录成功率。',
            impact: '婴幼儿死亡率下降，人口增长。', needs: ['cn_print'] },
          { id: 'cn_bank', name: '票号与银票', icon: '💰', short: '跨地汇兑', year: '清',
            desc: '异地汇兑，减少运银风险。',
            why: '大宗贸易需要信用工具。',
            tip: '有稳定政权背书才能做，否则就是空头支票。',
            impact: '商业资本形成，金融网络出现。', needs: ['cn_map'] }
        ]
      }
    ]
  }
];

// ==================== 政体适配说明 ====================
// 说明：这是虚构/历史语境下的治理形式与科技阶段的匹配分析，只作为世界设定参考
window.TECH_POLITICS = {
  '部落议事会': {
    fit: '石器时代 · 人数少、分工简单',
    why: '没有常备军、没有税收系统，靠血缘与声望维持秩序。',
    pros: '决策成本低，人人有发言权，迁移灵活。',
    cons: '无法组织大工程；人口过千就会分裂。',
    shift: '出现灌溉或城市后，议事会处理不了协调问题。'
  },
  '城邦 / 神权王权': {
    fit: '青铜时代 · 有了余粮与城墙',
    why: '灌溉与城墙需要动员大量人力，神权提供了合法性。',
    pros: '能修水利、建城墙，短期动员力极强。',
    cons: '权力无制约，继承容易出问题。',
    shift: '铁器普及、平民武装后，神权说服力下降。'
  },
  '封建分封': {
    fit: '铁器时代前期 · 交通不便、中央无力直辖',
    why: '道路与通信落后，中央管不到远方，只能层层分封。',
    pros: '边疆有人守，成本低。',
    cons: '诸侯坐大，中央弱则天下乱。',
    shift: '道路 + 常备军 + 官僚体系成熟后，转为中央集权。'
  },
  '中央集权': {
    fit: '铁器时代后期 – 蒸汽时代 · 有路、有文字、有税',
    why: '文书行政、道路网、统一货币让中央可以直接管到县。',
    pros: '动员能力最强，能修大工程、搞统一市场。',
    cons: '决策依赖顶层，纠错慢，容易信息失真。',
    shift: '电报出现后，中央控制力再次跃升；但市场复杂化后需要分权。'
  },
  '君主立宪': {
    fit: '蒸汽时代 · 资产阶级崛起、国王需要钱',
    why: '工厂主有钱、国王有军队，双方谁也吃不掉谁，只好分权。',
    pros: '产权有保障，商业能长期规划。',
    cons: '选举权一开始只给有钱人，矛盾积累。',
    shift: '工人组织起来后，选举权必须扩大。'
  },
  '技术官僚': {
    fit: '蒸汽 – 电气时代 · 工程复杂度超过通才',
    why: '铁路、电网、公共卫生需要专业判断，政客靠不住。',
    pros: '效率高，能办成大事。',
    cons: '用效率替代价值判断，容易忽视代价。',
    shift: '民众受教育后，会要求把决策权拿回来。'
  },
  '代议制共和': {
    fit: '电气时代 · 识字率高、媒体发达',
    why: '报纸与广播让全国性议题可讨论，代表制才运转得动。',
    pros: '纠错机制强，权力更替和平。',
    cons: '决策慢，容易被短期民意绑架。',
    shift: '信息过载后，议题被舆论撕裂。'
  },
  '联邦制': {
    fit: '电气 – 信息时代 · 疆域大、地方差异大',
    why: '各地情况差太多，中央一刀切必然出问题。',
    pros: '地方有试验空间，整体稳定。',
    cons: '协调成本高，应急时反应慢。',
    shift: '全国性危机（战争、灾害）会推动中央集权。'
  },
  '网络化治理': {
    fit: '信息时代 · 互联网普及',
    why: '信息传递成本趋零，组织可以扁平化。',
    pros: '响应快，个体参与度高。',
    cons: '谣言与操纵同样快；共识难形成。',
    shift: '算法推荐让群体分裂，可能退回到强中心。'
  },
  '技术寡头': {
    fit: '信息时代 · 平台掌握数据与算力',
    why: '谁掌握基础设施，谁就拥有事实上的治理权。',
    pros: '效率极高，创新快。',
    cons: '权力不受选举约束，退出成本高。',
    shift: '社会对平台垄断的反制，会决定下一步走向。'
  },
  '学院制': {
    fit: '魔法 · 学徒期 · 知识垄断在少数人手里',
    why: '魔法靠师承，学院是唯一能规模化培养的地方。',
    pros: '知识传承稳定，标准统一。',
    cons: '保守，排斥异端；资源集中在少数人。',
    shift: '法器普及后，平民也能施法，学院垄断被打破。'
  },
  '法师议会': {
    fit: '魔法 · 学院期 · 多个学院势均力敌',
    why: '没有单一强者能压服所有人，只能议事。',
    pros: '能协调大工程（传送门、魔网）。',
    cons: '内斗严重，变革缓慢。',
    shift: '魔晶能源让法师不再是唯一能源持有者。'
  },
  '技术官僚（魔法）': {
    fit: '魔法 · 工业期 · 魔力机械与魔网出现',
    why: '魔网、浮空艇这类系统需要长期专业规划。',
    pros: '能完成跨代际的大工程。',
    cons: '以效率之名牺牲底层。',
    shift: '魔网普及后，普通人有了议价能力。'
  },
  '分封制 / 变法集权': {
    fit: '先秦 · 铁器刚出现',
    why: '铁器让平民也能武装，旧贵族垄断被打破，变法有了土壤。',
    pros: '变法能快速提升国力。',
    cons: '触动既得利益，改革者往往不得善终。',
    shift: '统一度量衡 + 郡县制后，进入中央集权。'
  },
  '郡县制 / 中央集权（古代）': {
    fit: '秦汉 · 道路与文书行政成熟',
    why: '驰道 + 驿站 + 文书，让中央能直接任命与考核地方官。',
    pros: '动员力强，能修长城、治黄河。',
    cons: '官僚膨胀，财政压力大。',
    shift: '印刷与科举扩大后，官僚体系更稳定。'
  },
  '三省六部 / 科举官僚': {
    fit: '唐宋 · 印刷与科举普及',
    why: '书籍便宜、取士扩大，形成非血缘的官僚群体。',
    pros: '人才流动，行政专业化。',
    cons: '考试内容僵化，重文轻技。',
    shift: '火器与外贸出现后，需要技术与财政专才。'
  },
  '内阁制 / 君主专制（古代）': {
    fit: '明清 · 人口压力与外部威胁',
    why: '皇权集中能快速决策，但也容易封闭。',
    pros: '短期执行力强。',
    cons: '信息渠道单一，容易错过外部变化。',
    shift: '外部技术代差出现时，封闭的代价会非常大。'
  }
};

// ==================== 四、穿越者科技路线（独立总路线） ====================
// 前提：一个带着现代常识的人，落在一个没有工业的世界
window.TECH_TRAVELER_ROUTE = {
  id: 'traveler',
  name: '穿越者科技路线',
  icon: '🧭',
  desc: '带着现代常识落地：先活下来，再点科技树',
  eras: [
    {
      id: 'tv_survive', name: '求生期', icon: '🏕️', year: '第 1 年',
      politics: '村落依附 / 无政府',
      nodes: [
        { id: 'tv_fire', name: '稳定取火', icon: '🔥', short: '火折子、火镰、保存火种', year: '第 1 周',
          desc: '不靠钻木碰运气，做出能随身携带、随时点着的取火工具。',
          why: '火是生存底线，也是你在陌生世界第一个"超能力"。',
          tip: '落地第一件事，别急着造机器。',
          impact: '村落开始把你当"有本事的人"，获得落脚点。', needs: [] },
        { id: 'tv_salt', name: '提纯食盐', icon: '🧂', short: '煮盐、滤盐', year: '第 1 月',
          desc: '把粗盐溶解过滤再结晶，得到干净的盐。',
          why: '盐是硬通货，也是保存食物的关键。',
          tip: '有盐就能换粮食、换人情，比金子实在。',
          impact: '你从"外来者"变成"有用的人"。', needs: ['tv_fire'] },
        { id: 'tv_soap', name: '肥皂', icon: '🧼', short: '油脂 + 碱', year: '第 1 月',
          desc: '用草木灰提碱，与动物油脂皂化，做出原始肥皂。',
          why: '卫生是最容易被忽视、收益最大的技术。',
          tip: '先给接生婆和厨房用，口碑来得最快。',
          impact: '产褥热与伤口感染率下降，人口存活率上升。', needs: ['tv_fire'] },
        { id: 'tv_medicine', name: '基础外伤处理', icon: '🩹', short: '消毒、缝合、固定', year: '第 2 月',
          desc: '沸水煮器械、清洁伤口、简单缝合与夹板固定。',
          why: '古代最致命的不是大病，是伤口感染。',
          tip: '先把流程教给村里最手巧的人，别自己当神医。',
          impact: '伤兵与产妇死亡率骤降，你的话语权上升。', needs: ['tv_soap'] },
        { id: 'tv_food', name: '食物保存', icon: '🫙', short: '腌、熏、晒、窖藏', year: '第 3 月',
          desc: '用盐腌、烟熏、风干和地窖，把季节性食物存到淡季。',
          why: '不解决存粮，任何技术推广都会在荒季崩掉。',
          tip: '先做能过冬的量，再谈别的。',
          impact: '饥荒死亡率下降，村落能养更多人口。', needs: ['tv_salt'] },
        { id: 'tv_contacts', name: '人脉节点', icon: '🤝', short: '铁匠、木匠、郎中', year: '第 1 年',
          desc: '结识并绑定关键工匠：铁匠、木匠、石匠、郎中。',
          why: '你有知识，但只有他们能把知识变成实物。',
          tip: '用技术换合作，别用身份压人。',
          impact: '你从一个人，变成一个"能办事的小团体"。', needs: ['tv_salt'] }
      ]
    },
    {
      id: 'tv_stand', name: '立足期', icon: '🏘️', year: '第 1 – 5 年',
      politics: '宗族 / 乡绅共治',
      nodes: [
        { id: 'tv_plow', name: '改良农具', icon: '🐂', short: '铁犁、曲辕犁、耧车', year: '第 1 年',
          desc: '把直犁改成可调深浅的曲辕犁，配条播耧车。',
          why: '粮食是唯一能养活"脱产工匠"的东西。',
          tip: '先在一个村试点，产量数据比道理有说服力。',
          impact: '单产提升三成，出现第一批脱产人口。', needs: ['tv_contacts'] },
        { id: 'tv_water', name: '水车与水磨', icon: '💧', short: '水力代替人力', year: '第 2 年',
          desc: '立式水轮驱动磨盘、杵臼、鼓风。',
          why: '在没有蒸汽机之前，水是最便宜的动力。',
          tip: '选有稳定落差的河段，枯水期要能改人力。',
          impact: '粮食加工效率翻倍，腾出大量劳动力。', needs: ['tv_plow'] },
        { id: 'tv_lime', name: '石灰与水泥', icon: '🧱', short: '耐水建材', year: '第 2 年',
          desc: '烧石灰、配火山灰或黏土，做出能在水里凝固的砂浆。',
          why: '没有好建材，桥梁、水渠、城墙都做不大。',
          tip: '先修一段水渠验证，成功了再推桥梁。',
          impact: '水利与防御工程成本下降，城市雏形出现。', needs: ['tv_contacts'] },
        { id: 'tv_paper', name: '造纸与印刷', icon: '📄', short: '知识可复制', year: '第 3 年',
          desc: '树皮麻头制纸，再配雕版或泥活字。',
          why: '知识不能复制，你的技术就只能传一代。',
          tip: '先印农书和历书，这是最刚需的两样。',
          impact: '识字率上升，出现第一批"技术学徒"。', needs: ['tv_soap'] },
        { id: 'tv_blast', name: '高炉与焦炭', icon: '🔩', short: '量产铁', year: '第 4 年',
          desc: '提高炉温、用焦炭代替木炭，稳定出铁水。',
          why: '铁产量决定工具、武器与机械的上限。',
          tip: '需要耐火砖和鼓风设备，先把水泥和水力搞定。',
          impact: '铁器从奢侈品变成生产工具，工业萌芽。', needs: ['tv_lime', 'tv_water'] },
        { id: 'tv_gunpowder', name: '火药与火器', icon: '💥', short: '自保与破局', year: '第 5 年',
          desc: '配比火药，做出火铳或爆破用的药包。',
          why: '你会改变力量格局，必须先有自保手段。',
          tip: '慎用：火药一出，旧势力一定盯上你。',
          impact: '骑士与城墙的优势被削弱，权力重新洗牌。', needs: ['tv_blast'] }
      ]
    },
    {
      id: 'tv_industry', name: '工业萌芽', icon: '⚙️', year: '第 5 – 20 年',
      politics: '技术官僚 / 开明君主',
      nodes: [
        { id: 'tv_steam', name: '蒸汽机', icon: '🚂', short: '可移动动力', year: '第 8 年',
          desc: '做出低压蒸汽机，先用于矿井排水，再用于驱动机械。',
          why: '不依赖河流的动力，是工业化的分水岭。',
          tip: '密封件与气缸精度是难点，先做小功率。',
          impact: '工厂可以建在任何地方，城市化启动。', needs: ['tv_blast'] },
        { id: 'tv_textile', name: '纺织机械', icon: '🧵', short: '珍妮机、水力织机', year: '第 10 年',
          desc: '多锭纺纱与机械织布，把布匹变成工业品。',
          why: '纺织是最容易变现、最能吸收劳动力的产业。',
          tip: '先做纺纱再织布，纱线不够时织机是废铁。',
          impact: '手工业者失业，工厂工人出现。', needs: ['tv_steam'] },
        { id: 'tv_chem', name: '基础化工', icon: '⚗️', short: '硫酸、纯碱、漂白', year: '第 12 年',
          desc: '铅室法制硫酸，氨碱法制纯碱，用于纺织、造纸、玻璃。',
          why: '化工是"给所有产业供原料"的产业。',
          tip: '危险品，先解决通风与防护。',
          impact: '材料成本下降，日用品进入平民家庭。', needs: ['tv_blast', 'tv_paper'] },
        { id: 'tv_rail', name: '铁路与电报', icon: '🛤️', short: '运输 + 通信', year: '第 15 年',
          desc: '铁轨与机车解决货运，电报解决信息。',
          why: '没有通信的运输是盲的，两者必须一起上。',
          tip: '先修短途运煤线，回本后再延伸。',
          impact: '全国市场形成，中央第一次能实时指挥。', needs: ['tv_steam', 'tv_gunpowder'] },
        { id: 'tv_school', name: '技术学校', icon: '🏫', short: '批量培养工程师', year: '第 18 年',
          desc: '建立课程、教材与考核，成批培养技工。',
          why: '你一个人一天只有 12 小时，体系的产能是你的百倍。',
          tip: '教材用印刷版，别靠口传。',
          impact: '技术不再依赖你个人，文明开始自我加速。', needs: ['tv_paper', 'tv_textile'] }
      ]
    },
    {
      id: 'tv_electric', name: '电气化', icon: '⚡', year: '第 20 – 40 年',
      politics: '代议制 / 联邦',
      nodes: [
        { id: 'tv_generator', name: '发电机与电网', icon: '🔌', short: '电力普及', year: '第 22 年',
          desc: '把机械能转成电，用导线送到工厂与家庭。',
          why: '电可以精确控制、远距离输送，是第二次跃迁。',
          tip: '先给工厂供电，民用往后放。',
          impact: '工厂摆脱位置限制，夜间生产成为常态。', needs: ['tv_steam'] },
        { id: 'tv_light', name: '电灯与夜生活', icon: '💡', short: '延长有效时间', year: '第 24 年',
          desc: '白炽灯照亮街道与车间。',
          why: '照明直接把一天的有效时间拉长三分之一。',
          tip: '先装路灯，治安与商业都会跟着涨。',
          impact: '城市夜间经济出现，作息被改写。', needs: ['tv_generator'] },
        { id: 'tv_media', name: '电话与广播', icon: '📻', short: '信息网络', year: '第 28 年',
          desc: '电话解决点对点，广播解决一对多。',
          why: '统一的信息网络是现代社会的前提。',
          tip: '广播最适合推行政令与扫盲。',
          impact: '舆论成为力量，方言与地方势力被削弱。', needs: ['tv_rail', 'tv_generator'] },
        { id: 'tv_car', name: '内燃机与汽车', icon: '🚗', short: '个人交通', year: '第 32 年',
          desc: '小型内燃机驱动车辆，交通不再依赖轨道。',
          why: '道路自由化让城市向外扩张。',
          tip: '先做货运卡车，比轿车更赚钱。',
          impact: '郊区出现，物流成本再降一半。', needs: ['tv_chem', 'tv_steam'] },
        { id: 'tv_publichealth', name: '公共卫生', icon: '🚰', short: '下水道、自来水、疫苗', year: '第 35 年',
          desc: '建立供水、排污、检疫与疫苗接种体系。',
          why: '城市人口密度上去后，瘟疫会毁掉一切成果。',
          tip: '下水道最不显眼，但回报最高。',
          impact: '人均寿命大幅提升，人口结构改变。', needs: ['tv_medicine', 'tv_chem'] }
      ]
    },
    {
      id: 'tv_info', name: '信息时代', icon: '💻', year: '第 40 年以后',
      politics: '网络化治理 / 技术寡头',
      nodes: [
        { id: 'tv_computer', name: '电子计算机', icon: '🖥️', short: '可编程计算', year: '第 45 年',
          desc: '用电子器件执行指令，替代人工计算与调度。',
          why: '复杂系统的协调成本，只有计算机能压下来。',
          tip: '先把电网与半导体材料准备好。',
          impact: '科研与工程速度成倍提升。', needs: ['tv_generator', 'tv_school'] },
        { id: 'tv_network', name: '互联网', icon: '🌐', short: '全球互联', year: '第 55 年',
          desc: '把分散的计算机连成网络。',
          why: '信息复制成本趋零，协作方式被重写。',
          tip: '先连通大学与工厂，民用随后。',
          impact: '知识垄断被打破，也出现新的垄断。', needs: ['tv_computer', 'tv_media'] },
        { id: 'tv_ai', name: '人工智能', icon: '🤖', short: '机器替代脑力', year: '第 70 年',
          desc: '用算力和数据训练模型，完成识别、生成与决策。',
          why: '第一次让机器承担认知劳动。',
          tip: '前提是数据与算力都到位，否则只是玩具。',
          impact: '知识工作被重构，真假难辨成为常态。', needs: ['tv_contacts'] },
        { id: 'tv_space', name: '航天', icon: '🚀', short: '走出母星', year: '第 80 年',
          desc: '把载荷送入轨道，建立通信与观测网络。',
          why: '全球覆盖与深空探索都需要它。',
          tip: '材料与推进是瓶颈，别跳步。',
          impact: '世界被重新测量，边界感消失。', needs: ['tv_computer', 'tv_publichealth'] }
      ]
    }
  ]
};

// ==================== 给每条已有路线补「穿越者加速期」 ====================
window.TECH_TRAVELER_ERAS = {
  standard: {
    id: 'std_traveler', name: '穿越者加速期', icon: '🧭', year: '凭空多出来的捷径',
    politics: '开明专制 / 技术官僚',
    nodes: [
      { id: 'std_tv_chem', name: '现代化学下凡', icon: '⚗️', short: '跳过几百年试错', year: '对应 17 世纪',
        desc: '直接知道元素、酸碱、氧化还原，跳过炼金术的弯路。',
        why: '化学是唯一能"跳过试错"的领域，因为你已经知道答案。',
        tip: '但这个世界的材料纯度不同，配方要重做。',
        impact: '化工提前两三百年出现，材料革命提前。', needs: ['science'] },
      { id: 'std_tv_germ', name: '细菌与消毒', icon: '🦠', short: '知道病从哪来', year: '对应 19 世纪',
        desc: '知道微生物致病，推行洗手、消毒、煮沸。',
        why: '在没有抗生素的年代，卫生就是最高性价比的医术。',
        tip: '最难的不是知识，是让人相信要洗手。',
        impact: '产褥热与术后感染率断崖式下降。', needs: ['std_tv_chem'] },
      { id: 'std_tv_engine', name: '蒸汽机图纸', icon: '⚙️', short: '直接照抄原理', year: '对应 18 世纪',
        desc: '知道气缸、冷凝、曲柄的原理，省去百年试错。',
        why: '原理已知，剩下的是工艺与材料能不能跟上。',
        tip: '没有精密加工，图纸再好也造不出。',
        impact: '工业革命提前，但受限于工艺上限。', needs: ['std_tv_chem'] },
      { id: 'std_tv_print', name: '印刷 + 扫盲', icon: '🖨️', short: '知识扩散', year: '对应 16 世纪',
        desc: '用更低成本的印刷与强制扫盲，把知识铺开。',
        why: '知识只有扩散，才会变成生产力。',
        tip: '先印农书、医书、算书，别印诗集。',
        impact: '识字率跃升，出现技术阶层。', needs: ['std_tv_germ'] },
      { id: 'std_tv_gun', name: '火器改良', icon: '💥', short: '膛线、定装弹药', year: '对应 19 世纪',
        desc: '直接跳到线膛与定装弹，跳过火绳枪阶段。',
        why: '军事代差会引来围剿，也会带来谈判筹码。',
        tip: '慎用，过早暴露会改变整个地缘格局。',
        impact: '旧军事贵族被淘汰，中央集权加强。', needs: ['std_tv_engine'] }
    ]
  },
  magic: {
    id: 'magic_traveler', name: '穿越者加速期', icon: '🧭', year: '把科学带进魔法',
    politics: '学院改革派',
    nodes: [
      { id: 'mag_tv_method', name: '科学方法×魔法', icon: '🔬', short: '把法术变成可复现实验', year: '第 12 年',
        desc: '用对照组、重复实验来研究法术，而不是靠师承口诀。',
        why: '魔法世界最大的浪费是"没人验证过"。',
        tip: '会得罪学院，但这是唯一能规模化知识的路。',
        impact: '法术从手艺变成学科，进步速度翻倍。', needs: ['magic_literacy'] },
      { id: 'mag_tv_measure', name: '魔力计量', icon: '📏', short: '量化魔力', year: '第 15 年',
        desc: '定义魔力的单位、测量方法与换算标准。',
        why: '不能测量，就不能工程化。',
        tip: '先从魔晶充能效率入手，最容易出数据。',
        impact: '魔法定价、交易、标准化成为可能。', needs: ['mag_tv_method'] },
      { id: 'mag_tv_program', name: '法术编程', icon: '💠', short: '可组合的法术模块', year: '第 20 年',
        desc: '把法术拆成可复用的模块，像拼积木一样组合。',
        why: '复用是效率的来源。',
        tip: '需要魔法阵与计量的双重基础。',
        impact: '法术开发速度指数上升，出现"法术工程师"。', needs: ['mag_tv_measure', 'magic_array'] },
      { id: 'mag_tv_industry', name: '魔法流水线', icon: '🏭', short: '量产法具', year: '第 30 年',
        desc: '把附魔拆成工序，用魔像与阵法批量生产。',
        why: '手工法具撑不起战争与民用需求。',
        tip: '魔晶供应必须稳定，否则流水线会停。',
        impact: '法具平民化，法师阶层特权被削弱。', needs: ['mag_tv_program', 'mana_crystal'] },
      { id: 'mag_tv_theory', name: '魔力统一理论', icon: '🧮', short: '解释魔力到底是什么', year: '第 60 年',
        desc: '建立能解释所有法术现象的统一模型。',
        why: '理论统一之后，新法术才会成体系涌现。',
        tip: '需要长期数据积累，急不得。',
        impact: '魔法文明从"会用"进入"理解"。', needs: ['mag_tv_industry'] }
    ]
  },
  china: {
    id: 'cn_traveler', name: '穿越者加速期', icon: '🧭', year: '用现代知识少走弯路',
    politics: '变法派 / 洋务式改良',
    nodes: [
      { id: 'cn_tv_soap', name: '肥皂与消毒', icon: '🧼', short: '卫生革命', year: '落地即可',
        desc: '草木灰制碱、油脂皂化，配合煮沸消毒。',
        why: '古代婴幼儿死亡率极高，卫生是第一民生。',
        tip: '从稳婆和军营入手，见效最快。',
        impact: '人口存活率上升，劳动力变多。', needs: [] },
      { id: 'cn_tv_cement', name: '水泥与高炉', icon: '🧱', short: '建材与钢铁', year: '3-5 年',
        desc: '烧石灰配黏土得水泥，提高炉温炼铁水。',
        why: '材料决定能修多大的工程、造多好的兵器。',
        tip: '先修水利，再修城防。',
        impact: '工程能力跃升，城市与水利加速。', needs: ['cn_tv_soap'] },
      { id: 'cn_tv_agri', name: '农学改良', icon: '🌾', short: '轮作、育种、化肥雏形', year: '3-8 年',
        desc: '推广轮作、沤肥、选种，试制骨粉与绿肥。',
        why: '没有粮食增量，一切改革都撑不过荒年。',
        tip: '先在一县做出增产数据，再上报推广。',
        impact: '单产提高，人口与财政基础变厚。', needs: ['cn_tv_soap'] },
      { id: 'cn_tv_steam', name: '蒸汽机与机器', icon: '⚙️', short: '动力革命', year: '10-20 年',
        desc: '造低压蒸汽机，先用于矿井与纺织。',
        why: '人力畜力有上限，突破只能靠机械动力。',
        tip: '精密加工是短板，先从低精度重工业切入。',
        impact: '工厂出现，手工业者破产，社会动荡。', needs: ['cn_tv_cement'] },
      { id: 'cn_tv_edu', name: '新式学堂', icon: '🎓', short: '数理化进课堂', year: '10-20 年',
        desc: '设算学、格致、舆图课程，培养技术官僚。',
        why: '没有自己的人才，你的知识传不下去。',
        tip: '与科举并行过渡，别一刀切废除，会激化矛盾。',
        impact: '出现技术官僚群体，改革有了执行者。', needs: ['cn_print', 'cn_tv_cement'] }
    ]
  }
};

// ==================== 组装：每条主题各分「标准 / 穿越者」 ====================
// 💡 原则：标准线 = 本地人靠自己摸索；穿越者线 = 带着现代常识介入，但有暴露风险
window.TECH_WARNING = '结合当时环境，小心被发现哦';

(function buildRoutes() {
  var base = {};
  window.TECH_ROUTES.forEach(function (r) { base[r.id] = r; });

  var copy = function (obj) { return JSON.parse(JSON.stringify(obj)); };

  // ---------- 魔法 · 标准线（原住民法师靠自己摸索，没有现代方法） ----------
  var magicNative = {
    id: 'magic_native',
    name: '魔法 · 标准发展',
    icon: '🔮',
    desc: '原住民法师的路子：师承、试错、禁忌，一步都不能跳',
    traveler: false,
    eras: [
      {
        id: 'mn_dawn', name: '启蒙', icon: '✨', year: '第 1 – 5 年', politics: '村落自治',
        nodes: [
          { id: 'mn_sense', name: '元素感知', icon: '👁️', short: '看见魔力流动', year: '第 1 年',
            desc: '用内在感官分辨元素浓度，通常是靠冥想慢慢开窍。',
            why: '这是入场券，没有感知的人一辈子是凡人。',
            tip: '没有捷径，只能靠时间堆。',
            impact: '从凡人变成施法者。', needs: [] },
          { id: 'mn_core', name: '魔力回路', icon: '🌀', short: '体内循环', year: '第 2 年',
            desc: '打通魔力循环，形成可蓄能的核心。',
            why: '没有回路，施法一次就要瘫三天。',
            tip: '天赋差的人可能要五年，别硬来。',
            impact: '可以持续施法。', needs: ['mn_sense'] },
          { id: 'mn_apprentice', name: '拜师', icon: '🧓', short: '进入师承体系', year: '第 3 年',
            desc: '找到愿意教你的法师，成为学徒。',
            why: '这个世界的知识在师徒之间口传，不拜师就只能自己撞墙。',
            tip: '选师父比选法术重要，先看人品再看本事。',
            impact: '你进入了一个有传承的圈子。', needs: ['mn_core'] },
          { id: 'mn_rune', name: '基础符文', icon: '📖', short: '读写符文', year: '第 4 年',
            desc: '学习法师通用符文，能读基础文献。',
            why: '不能读文献，就永远只能学师父会的那几手。',
            tip: '师父通常不会主动教你全部，要自己找书。',
            impact: '从跟着做变成看得懂。', needs: ['mn_apprentice'] },
          { id: 'mn_channel', name: '魔导体质', icon: '💪', short: '强化肉身', year: '第 5 年',
            desc: '用魔力强化身体，承受更强的反噬。',
            why: '法师最大的敌人是反噬，不是敌人。',
            tip: '体质跟不上，法术越强死得越快。',
            impact: '能练更高阶的法术。', needs: ['mn_core'] }
        ]
      },
      {
        id: 'mn_craft', name: '工艺', icon: '🧪', year: '第 5 – 20 年', politics: '学院制',
        nodes: [
          { id: 'mn_array', name: '魔法阵', icon: '⛩️', short: '把咒语刻成结构', year: '第 8 年',
            desc: '用几何符文固化法术，可重复触发。',
            why: '这一步让魔法从手艺变成可复制的技术。',
            tip: '阵图一旦成型，就能交给别人用。',
            impact: '法术可以脱离施法者独立运行。', needs: ['mn_rune', 'mn_channel'] },
          { id: 'mn_alchemy', name: '炼金术', icon: '⚗️', short: '材料转化', year: '第 10 年',
            desc: '用魔力改变物质，提炼药剂与材料。',
            why: '材料是魔法的粮食。',
            tip: '配方都是师徒私藏，要花时间换。',
            impact: '出现稳定供应魔法材料的作坊。', needs: ['mn_rune'] },
          { id: 'mn_potion', name: '魔药', icon: '🧪', short: '封存魔力', year: '第 12 年',
            desc: '把魔力封进药剂，非施法者也能用。',
            why: '让普通人受益，魔法才有市场。',
            tip: '先做治疗药，最容易卖出去。',
            impact: '医疗改善，法师地位上升。', needs: ['mn_alchemy'] },
          { id: 'mn_enchant', name: '附魔', icon: '⚔️', short: '器物带属性', year: '第 15 年',
            desc: '把法术刻进武器防具，长期生效。',
            why: '装备决定军队上限。',
            tip: '附魔失败会炸，先在废铁上练。',
            impact: '战争形态改变。', needs: ['mn_array'] },
          { id: 'mn_school', name: '学院', icon: '🏫', short: '成体系培养', year: '第 20 年',
            desc: '建立课程、评级与考核制度。',
            why: '没有学院，知识断在少数天才手里。',
            tip: '学院一旦建立，就会开始排斥民间法师。',
            impact: '法师从稀缺品变成职业群体。', needs: ['mn_rune', 'mn_array'] }
        ]
      },
      {
        id: 'mn_kingdom', name: '王国', icon: '🏛️', year: '第 20 – 80 年', politics: '法师议会',
        nodes: [
          { id: 'mn_fuse', name: '元素融合', icon: '🌪️', short: '复合法术', year: '第 25 年',
            desc: '把多种元素结合，产生新效果。',
            why: '单元素法术很快到瓶颈。',
            tip: '失败率极高，学院会因此禁止。',
            impact: '魔法体系扩张，学科分化。', needs: ['mn_array', 'mn_channel'] },
          { id: 'mn_golem', name: '魔像', icon: '🗿', short: '可编程劳动力', year: '第 30 年',
            desc: '给无机材料赋予指令跟随能力。',
            why: '劳动力不足是所有文明的天花板。',
            tip: '魔像失控是学院最常见的灾难。',
            impact: '劳动力不再稀缺，社会结构被颠覆。', needs: ['mn_enchant', 'mn_alchemy'] },
          { id: 'mn_crystal', name: '魔晶', icon: '💎', short: '可储存的魔力', year: '第 40 年',
            desc: '把魔力压缩进晶体，可运输、可交易。',
            why: '能源必须能储存和运输，魔法才能离开法师。',
            tip: '灌注成本极高，先做小颗试产。',
            impact: '能源成为商品，矿业兴起。', needs: ['mn_golem', 'mn_potion'] },
          { id: 'mn_airship', name: '浮空艇', icon: '🛩️', short: '空中运输', year: '第 50 年',
            desc: '用反重力阵让大型载具升空。',
            why: '地面被地形和国界限制，天空没有。',
            tip: '能耗极高，没有魔晶就别想。',
            impact: '远程运输三维化。', needs: ['mn_enchant', 'mn_golem'] },
          { id: 'mn_grid', name: '魔网', icon: '🕸️', short: '魔力输送网', year: '第 60 年',
            desc: '用导魔材料铺设网络，把魔力送到各处。',
            why: '没有配送网，魔力只是富人的玩具。',
            tip: '魔网一建成，法师的垄断就开始松动。',
            impact: '能源普惠，偏远地区也能用魔法设备。', needs: ['mn_crystal', 'mn_school'] }
        ]
      },
      {
        id: 'mn_industry', name: '魔导工业', icon: '🏭', year: '第 60 – 150 年', politics: '技术官僚（魔法）',
        nodes: [
          { id: 'mn_engine', name: '魔力引擎', icon: '⚙️', short: '魔晶驱动机械', year: '第 70 年',
            desc: '用魔晶驱动机械，取代人力与畜力。',
            why: '这是魔法世界的蒸汽机，一次性解决动力问题。',
            tip: '需要稳定的魔晶供应。',
            impact: '出现工厂，城市化加速。', needs: ['mn_crystal', 'mn_golem'] },
          { id: 'mn_mass_enchant', name: '量产附魔', icon: '🏗️', short: '流水线造法具', year: '第 80 年',
            desc: '把附魔拆成工序，用魔像批量生产。',
            why: '手工作坊撑不起战争与民用需求。',
            tip: '良品率是瓶颈，先做低阶法具。',
            impact: '法具平民化，法师特权被削弱。', needs: ['mn_golem', 'mn_enchant', 'mn_grid'] },
          { id: 'mn_chem', name: '炼金工业', icon: '🧫', short: '批量造材料', year: '第 90 年',
            desc: '用魔力驱动的反应釜生产药剂、合金与导魔材料。',
            why: '材料产能决定其它一切的上限。',
            tip: '污染会被学院追责，选址要远离城市。',
            impact: '材料价格暴跌，平民也能用魔法制品。', needs: ['mn_alchemy', 'mn_engine'] },
          { id: 'mn_portal_net', name: '传送网', icon: '🚪', short: '点对点物流', year: '第 110 年',
            desc: '沿魔网节点建立传送门，形成物流网络。',
            why: '地理屏障是文明扩张的最大成本。',
            tip: '坐标误差会把人送进墙里，需要长期校准。',
            impact: '远程贸易与调兵时间趋零。', needs: ['mn_grid', 'mn_engine'] },
          { id: 'mn_golem_army', name: '魔像军团', icon: '🛡️', short: '标准化武装', year: '第 120 年',
            desc: '用统一阵图批量生产战斗魔像。',
            why: '人力军队的成本会压垮国家。',
            tip: '一旦开这个头，战争就再也停不下来。',
            impact: '战争规模扩大，平民伤亡上升。', needs: ['mn_mass_enchant', 'mn_engine'] },
          { id: 'mn_alliance', name: '学院联盟', icon: '🤝', short: '跨国的知识共同体', year: '第 140 年',
            desc: '各学院互换 curricula、共享阵图库。',
            why: '知识分散在各地，重复试错太浪费。',
            tip: '联盟会让落后者永久落后。',
            impact: '魔法研究速度翻倍，也形成知识霸权。', needs: ['mn_school', 'mn_portal_net'] }
        ]
      },
      {
        id: 'mn_civ', name: '文明', icon: '🌆', year: '第 150 年以后', politics: '法师共和国',
        nodes: [
          { id: 'mn_city', name: '浮空城', icon: '🏰', short: '空中城市', year: '第 160 年',
            desc: '把整座城市托在空中。',
            why: '地面资源被瓜分完后，垂直空间成为新大陆。',
            tip: '需要魔网与魔晶共同支撑。',
            impact: '阶级以海拔划分。', needs: ['mn_grid', 'mn_engine'] },
          { id: 'mn_immortal', name: '永生术', icon: '♾️', short: '停止衰老', year: '第 200 年',
            desc: '把灵魂固定在法阵里，规避衰亡。',
            why: '知识积累者如果会死，文明每次都要重来。',
            tip: '代价极大，且被各国明令禁止。',
            impact: '出现长生者阶层，社会固化。', needs: ['mn_city', 'mn_chem'] },
          { id: 'mn_life', name: '人造生命', icon: '🧬', short: '从零造出生命', year: '第 240 年',
            desc: '不依赖已有生命，直接构造有意识的存在。',
            why: '从改造生命到创造生命，是造物主级别的门槛。',
            tip: '学院会集体反对，但你挡不住后来者。',
            impact: '谁是人的定义被动摇。', needs: ['mn_immortal', 'mn_golem_army'] },
          { id: 'mn_worldtree', name: '世界树工程', icon: '🌳', short: '改造世界底层', year: '第 300 年',
            desc: '用巨型法阵重塑大陆的魔力流向。',
            why: '不再改造设备，而是改造世界的规则。',
            tip: '一旦启动就无法停下，失败等于大陆枯竭。',
            impact: '整个大陆的气候与魔力分布被改写。', needs: ['mn_life', 'mn_city', 'mn_grid'] },
          { id: 'mn_forbidden', name: '禁忌研究', icon: '🚫', short: '越过公认的界线', year: '第 350 年',
            desc: '研究被学院明令禁止的领域：灵魂、空间裂隙、神格。',
            why: '真正的突破往往在被禁止的地方。',
            tip: '一旦被发现，你面对的不是敌人，是整个学院。',
            impact: '要么被清算，要么改写规则。', needs: ['mn_worldtree'] }
        ]
      }
    ]
  };

  // ---------- 组合 ----------
  var std = base.standard;
  var mag = base.magic;
  var cn = base.china;

  // 去掉之前追加到原路线里的加速期
  [std, mag, cn].forEach(function (r) {
    if (!r) return;
    r.eras = r.eras.filter(function (e) { return !/^(std_traveler|magic_traveler|cn_traveler)$/.test(e.id); });
  });

  var stdTraveler = copy(std);
  stdTraveler.id = 'standard_traveler';
  stdTraveler.name = '文明 · 穿越者';
  stdTraveler.desc = '带着现代常识落进历史现场：能跳步，但会被盯上';
  stdTraveler.traveler = true;
  stdTraveler.eras.push(copy(window.TECH_TRAVELER_ERAS.standard));

  // 原来那条「魔法穿越线」本身就是穿越者视角，直接作为穿越者线使用
  var magTraveler = mag;
  magTraveler.id = 'magic_traveler';
  magTraveler.name = '魔法 · 穿越者';
  magTraveler.desc = '用科学方法重做魔法研究：进步快，也最容易被学院盯上';
  magTraveler.traveler = true;
  magTraveler.eras.push(copy(window.TECH_TRAVELER_ERAS.magic));

  var cnNative = copy(cn);
  cnNative.id = 'china_native';
  cnNative.name = '中国古代 · 标准';
  cnNative.desc = '纯历史路径：没有金手指，只能按时代条件一步步来';
  cnNative.traveler = false;

  var cnTraveler = copy(cn);
  cnTraveler.id = 'china_traveler';
  cnTraveler.name = '中国古代 · 穿越者';
  cnTraveler.desc = '用现代知识做局部改造：能少走弯路，但别让人看出你不对劲';
  cnTraveler.traveler = true;
  cnTraveler.eras.push(copy(window.TECH_TRAVELER_ERAS.china));

  std.traveler = false;

  // ---------- 主题归类：一类两个变体 ----------
  var meta = function (r, theme, variant, themeName, themeIcon) {
    r.theme = theme;
    r.themeName = themeName;
    r.themeIcon = themeIcon;
    r.variant = variant;
    return r;
  };

  meta(std, 'civ', 'native', '文明', '🌍');
  meta(stdTraveler, 'civ', 'traveler', '文明', '🌍');
  meta(magicNative, 'magic', 'native', '魔法', '🔮');
  meta(magTraveler, 'magic', 'traveler', '魔法', '🔮');
  meta(cnNative, 'china', 'native', '古代中国', '🏮');
  meta(cnTraveler, 'china', 'traveler', '古代中国', '🏮');
  meta(window.TECH_TRAVELER_ROUTE, 'traveler', 'traveler', '穿越者通用', '🧭');

  std.name = '文明 · 标准';
  std.desc = '从石器到信息时代，本地人自己走出来的主干';

  window.TECH_ROUTES = [
    std,            // 🏠 标准
    stdTraveler,    // 🧭 穿越者
    magicNative,    // 🏠 标准
    magTraveler,    // 🧭 穿越者
    cnNative,       // 🏠 标准
    cnTraveler,     // 🧭 穿越者
    window.TECH_TRAVELER_ROUTE   // 🧭 通用穿越者
  ];

  // 主题顺序（决定顶部标签顺序）
  window.TECH_THEMES = ['civ', 'magic', 'china', 'traveler'];
  window.TECH_TRAVELER_ROUTE.traveler = true;
})();

// 穿越者路线用到的政体补充说明
Object.assign(window.TECH_POLITICS, {
  '村落依附': {
    fit: '穿越落地第一年 · 没有身份、没有武装',
    why: '外来者要活下来，只能先依附一个能提供庇护的村落。',
    pros: '安全、有饭吃、能观察这个世界的规则。',
    cons: '没有话语权，随时可能被驱逐。',
    shift: '当你带来第一项实用技术后，身份就开始变化。'
  },
  '宗族 / 乡绅共治': {
    fit: '立足期 · 有了一点声望和产业',
    why: '在古代乡村，宗族与乡绅才是真正的执行力。',
    pros: '推广技术快，成本低。',
    cons: '利益绑定，改革会被人情拖住。',
    shift: '出现跨村贸易与常备武装后，需要更高一级的秩序。'
  },
  '开明君主': {
    fit: '工业萌芽 · 需要集中力量办大事',
    why: '铁路、工厂、学校都需要长期投入，只有强权能压住短期反对。',
    pros: '决策快，能干成跨代工程。',
    cons: '依赖君主本人的判断，人一换就前功尽弃。',
    shift: '技术阶层壮大后会要求制度化分权。'
  },
  '开明专制': {
    fit: '穿越者加速期 · 你手里有超越时代的知识',
    why: '你的优势是知识代差，最快的落地方式是自上而下推行。',
    pros: '效率极高，几年能走完别人百年的路。',
    cons: '没有制衡，一旦判断错误就是灾难。',
    shift: '识字率与中产出现后，必须交出部分权力。'
  },
  '代议制': {
    fit: '电气化 · 识字率高、媒体普及',
    why: '全国性议题需要公开讨论，代表制才运转得动。',
    pros: '纠错能力强，权力更替和平。',
    cons: '决策慢，容易被短期民意绑架。',
    shift: '信息过载后，议题开始被舆论撕裂。'
  },
  '学院改革派': {
    fit: '魔法 · 穿越者加速期',
    why: '学院垄断知识，但也是唯一能规模化验证的地方。',
    pros: '有设备、有人才、有传承。',
    cons: '保守势力会视你为异端。',
    shift: '量产法具让平民也能施法后，学院必须开放。'
  },
  '变法派': {
    fit: '古代中国 · 穿越者推动改革',
    why: '旧制度效率太低，必须有一批人顶着压力改。',
    pros: '能快速提升国力。',
    cons: '触动既得利益，改革者往往不得善终。',
    shift: '新式学堂培养出技术官僚后，改革可以制度化。'
  },
  '洋务式改良': {
    fit: '古代中国 · 只学技术不改制度',
    why: '既得利益太大，先买机器、办学堂，绕开制度。',
    pros: '阻力小，能快速拿到硬件。',
    cons: '没有制度配套，技术会被旧体系吃掉。',
    shift: '甲午式的失败会证明：只改技术不够。'
  }
});

Object.assign(window.TECH_POLITICS, {
  '村落自治': {
    fit: '魔法 · 苏醒期 · 能力弱小、尚无体系',
    why: '村里人靠习惯与长老维持秩序，还没有形成国家。',
    pros: '压力小，适合安心修炼。',
    cons: '资源少，遇到外敌毫无抵抗。',
    shift: '你掌握法术之后，会被更大的势力盯上。'
  },
  '法师共和国': {
    fit: '魔法 · 文明期 · 法师阶层已成主导',
    why: '掌握魔力的人自然掌握权力，共和只是法师之间的分权形式。',
    pros: '决策由懂行的人做，长周期工程能推进。',
    cons: '非施法者被排除在外，社会分层固化。',
    shift: '法器普及、平民可用魔力后，这个制度会被推翻。'
  },
  '神权': {
    fit: '魔法 · 文明期 · 魔力被解释为神意',
    why: '当力量无法被普通人理解，宗教就是最省力的合法性。',
    pros: '动员力极强，秩序稳定。',
    cons: '压制研究，一旦教义出错就会全盘崩塌。',
    shift: '魔法被科学化解释后，神权的基础消失。'
  },
  '内阁制': {
    fit: '明清 · 文书行政成熟、皇权需要帮手',
    why: '政务量超过皇帝能处理的极限，只能靠内阁票拟。',
    pros: '行政效率提升，专业分工。',
    cons: '权力来源仍是皇权，容易被宦官或权臣架空。',
    shift: '外部技术代差出现时，这套体系反应太慢。'
  },
  '君主专制': {
    fit: '明清 · 人口压力与外部威胁',
    why: '集中权力能快速决策、快速动员。',
    pros: '短期执行力极强。',
    cons: '信息渠道单一，容易错过外部变化。',
    shift: '技术代差拉开后，封闭的代价会非常大。'
  }
});
