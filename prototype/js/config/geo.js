/* Egyptian governorates and pricing zones. Admin can edit the governorate list at runtime
   (Settings); this file is the default the seed starts from. `code` is the two-digit
   governorate code used inside national IDs. lat/lng is the governorate centre used to
   simulate GPS check-ins. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  ICM.config = ICM.config || {};

  ICM.config.ZONES = [
    { id: 'greater_cairo', en: 'Greater Cairo', ar: 'القاهرة الكبرى' },
    { id: 'alexandria', en: 'Alexandria and North Coast', ar: 'الإسكندرية والساحل الشمالي' },
    { id: 'delta', en: 'Delta', ar: 'الدلتا' },
    { id: 'canal', en: 'Canal and Red Sea', ar: 'القناة والبحر الأحمر' },
    { id: 'upper', en: 'Upper Egypt', ar: 'الصعيد' }
  ];

  ICM.config.GOVERNORATES = [
    { id: 'cairo', en: 'Cairo', ar: 'القاهرة', zone: 'greater_cairo', code: '01', lat: 30.0444, lng: 31.2357 },
    { id: 'giza', en: 'Giza', ar: 'الجيزة', zone: 'greater_cairo', code: '21', lat: 30.0131, lng: 31.2089 },
    { id: 'qalyubia', en: 'Qalyubia', ar: 'القليوبية', zone: 'greater_cairo', code: '14', lat: 30.1792, lng: 31.2056 },
    { id: 'alexandria', en: 'Alexandria', ar: 'الإسكندرية', zone: 'alexandria', code: '02', lat: 31.2001, lng: 29.9187 },
    { id: 'beheira', en: 'Beheira', ar: 'البحيرة', zone: 'alexandria', code: '18', lat: 31.0341, lng: 30.4682 },
    { id: 'matrouh', en: 'Matrouh', ar: 'مطروح', zone: 'alexandria', code: '33', lat: 31.3543, lng: 27.2373 },
    { id: 'sharqia', en: 'Sharqia', ar: 'الشرقية', zone: 'delta', code: '13', lat: 30.5877, lng: 31.5020 },
    { id: 'dakahlia', en: 'Dakahlia', ar: 'الدقهلية', zone: 'delta', code: '12', lat: 31.0409, lng: 31.3785 },
    { id: 'gharbia', en: 'Gharbia', ar: 'الغربية', zone: 'delta', code: '16', lat: 30.7865, lng: 31.0004 },
    { id: 'monufia', en: 'Monufia', ar: 'المنوفية', zone: 'delta', code: '17', lat: 30.5972, lng: 30.9876 },
    { id: 'kafr_el_sheikh', en: 'Kafr El Sheikh', ar: 'كفر الشيخ', zone: 'delta', code: '15', lat: 31.1107, lng: 30.9388 },
    { id: 'damietta', en: 'Damietta', ar: 'دمياط', zone: 'delta', code: '11', lat: 31.4165, lng: 31.8133 },
    { id: 'port_said', en: 'Port Said', ar: 'بورسعيد', zone: 'canal', code: '03', lat: 31.2653, lng: 32.3019 },
    { id: 'ismailia', en: 'Ismailia', ar: 'الإسماعيلية', zone: 'canal', code: '19', lat: 30.5965, lng: 32.2715 },
    { id: 'suez', en: 'Suez', ar: 'السويس', zone: 'canal', code: '04', lat: 29.9668, lng: 32.5498 },
    { id: 'red_sea', en: 'Red Sea', ar: 'البحر الأحمر', zone: 'canal', code: '31', lat: 27.2579, lng: 33.8116 },
    { id: 'faiyum', en: 'Faiyum', ar: 'الفيوم', zone: 'upper', code: '23', lat: 29.3084, lng: 30.8428 },
    { id: 'beni_suef', en: 'Beni Suef', ar: 'بني سويف', zone: 'upper', code: '22', lat: 29.0661, lng: 31.0994 },
    { id: 'minya', en: 'Minya', ar: 'المنيا', zone: 'upper', code: '24', lat: 28.0871, lng: 30.7618 },
    { id: 'assiut', en: 'Assiut', ar: 'أسيوط', zone: 'upper', code: '25', lat: 27.1809, lng: 31.1837 },
    { id: 'sohag', en: 'Sohag', ar: 'سوهاج', zone: 'upper', code: '26', lat: 26.5591, lng: 31.6957 },
    { id: 'qena', en: 'Qena', ar: 'قنا', zone: 'upper', code: '27', lat: 26.1551, lng: 32.7160 },
    { id: 'luxor', en: 'Luxor', ar: 'الأقصر', zone: 'upper', code: '29', lat: 25.6872, lng: 32.6396 },
    { id: 'aswan', en: 'Aswan', ar: 'أسوان', zone: 'upper', code: '28', lat: 24.0889, lng: 32.8998 },
    { id: 'new_valley', en: 'New Valley', ar: 'الوادي الجديد', zone: 'upper', code: '32', lat: 25.4390, lng: 30.5586 },
    { id: 'north_sinai', en: 'North Sinai', ar: 'شمال سيناء', zone: 'canal', code: '34', lat: 31.1316, lng: 33.7984 },
    { id: 'south_sinai', en: 'South Sinai', ar: 'جنوب سيناء', zone: 'canal', code: '35', lat: 28.2364, lng: 33.6254 }
  ];

  // Main cities and districts per governorate, used by registration (address and
  // coverage) and team coverage. A governorate without an entry falls back to free text.
  function c(list) { return list.map(function (x) { return { id: x[0], en: x[1], ar: x[2] }; }); }
  ICM.config.CITIES = {
    cairo: c([['nasr_city', 'Nasr City', 'مدينة نصر'], ['heliopolis', 'Heliopolis', 'مصر الجديدة'], ['maadi', 'Maadi', 'المعادي'], ['new_cairo', 'New Cairo', 'القاهرة الجديدة'], ['shubra', 'Shubra', 'شبرا'], ['mokattam', 'Mokattam', 'المقطم'], ['downtown', 'Downtown', 'وسط البلد'], ['zamalek', 'Zamalek', 'الزمالك'], ['ain_shams', 'Ain Shams', 'عين شمس'], ['matareya', 'El Matareya', 'المطرية'], ['el_marg', 'El Marg', 'المرج'], ['el_salam', 'El Salam', 'السلام'], ['helwan', 'Helwan', 'حلوان'], ['shorouk', 'El Shorouk', 'الشروق'], ['badr', 'Badr City', 'مدينة بدر']]),
    giza: c([['dokki', 'Dokki', 'الدقي'], ['mohandessin', 'Mohandessin', 'المهندسين'], ['agouza', 'Agouza', 'العجوزة'], ['haram', 'Haram', 'الهرم'], ['faisal', 'Faisal', 'فيصل'], ['imbaba', 'Imbaba', 'إمبابة'], ['bulaq_dakrur', 'Bulaq El Dakrur', 'بولاق الدكرور'], ['october', '6th of October', 'السادس من أكتوبر'], ['sheikh_zayed', 'Sheikh Zayed', 'الشيخ زايد'], ['warraq', 'El Warraq', 'الوراق'], ['kerdasa', 'Kerdasa', 'كرداسة'], ['hawamdeya', 'El Hawamdeya', 'الحوامدية'], ['badrashin', 'El Badrashin', 'البدرشين'], ['ayat', 'El Ayat', 'العياط'], ['atfih', 'Atfih', 'أطفيح']]),
    qalyubia: c([['banha', 'Banha', 'بنها'], ['shubra_el_kheima', 'Shubra El Kheima', 'شبرا الخيمة'], ['qalyub', 'Qalyub', 'قليوب'], ['qanater', 'El Qanater El Khayreya', 'القناطر الخيرية'], ['khanka', 'El Khanka', 'الخانكة'], ['obour', 'El Obour', 'العبور'], ['toukh', 'Toukh', 'طوخ'], ['kafr_shukr', 'Kafr Shukr', 'كفر شكر'], ['shebin_el_qanater', 'Shebin El Qanater', 'شبين القناطر']]),
    alexandria: c([['montaza', 'Montaza', 'المنتزه'], ['mandara', 'El Mandara', 'المندرة'], ['miami', 'Miami', 'ميامي'], ['raml', 'El Raml', 'الرمل'], ['stanley', 'Stanley', 'ستانلي'], ['smouha', 'Smouha', 'سموحة'], ['sidi_gaber', 'Sidi Gaber', 'سيدي جابر'], ['moharam_bek', 'Moharam Bek', 'محرم بك'], ['gomrok', 'El Gomrok', 'الجمرك'], ['agami', 'El Agami', 'العجمي'], ['amreya', 'El Amreya', 'العامرية'], ['borg_el_arab', 'Borg El Arab', 'برج العرب']]),
    beheira: c([['damanhour', 'Damanhour', 'دمنهور'], ['kafr_el_dawar', 'Kafr El Dawar', 'كفر الدوار'], ['rashid', 'Rashid', 'رشيد'], ['edku', 'Edku', 'إدكو'], ['abu_hummus', 'Abu Hummus', 'أبو حمص'], ['itay_el_barud', 'Itay El Barud', 'إيتاي البارود'], ['kom_hamada', 'Kom Hamada', 'كوم حمادة'], ['abu_el_matamir', 'Abu El Matamir', 'أبو المطامير'], ['wadi_el_natrun', 'Wadi El Natrun', 'وادي النطرون']]),
    matrouh: c([['marsa_matrouh', 'Marsa Matrouh', 'مرسى مطروح'], ['el_alamein', 'El Alamein', 'العلمين'], ['el_dabaa', 'El Dabaa', 'الضبعة'], ['el_hammam', 'El Hammam', 'الحمام'], ['sidi_barrani', 'Sidi Barrani', 'سيدي براني'], ['salloum', 'El Salloum', 'السلوم'], ['siwa', 'Siwa', 'سيوة']]),
    sharqia: c([['zagazig', 'Zagazig', 'الزقازيق'], ['tenth_of_ramadan', '10th of Ramadan', 'العاشر من رمضان'], ['belbeis', 'Belbeis', 'بلبيس'], ['minya_el_qamh', 'Minya El Qamh', 'منيا القمح'], ['abu_kabir', 'Abu Kabir', 'أبو كبير'], ['faqous', 'Faqous', 'فاقوس'], ['hehya', 'Hehya', 'ههيا'], ['abu_hammad', 'Abu Hammad', 'أبو حماد'], ['diyarb_negm', 'Diyarb Negm', 'ديرب نجم'], ['kafr_saqr', 'Kafr Saqr', 'كفر صقر']]),
    dakahlia: c([['mansoura', 'Mansoura', 'المنصورة'], ['talkha', 'Talkha', 'طلخا'], ['mit_ghamr', 'Mit Ghamr', 'ميت غمر'], ['aga', 'Aga', 'أجا'], ['sherbin', 'Sherbin', 'شربين'], ['senbellawein', 'El Senbellawein', 'السنبلاوين'], ['dikirnis', 'Dikirnis', 'دكرنس'], ['belqas', 'Belqas', 'بلقاس'], ['manzala', 'El Manzala', 'المنزلة'], ['gamasa', 'Gamasa', 'جمصة']]),
    gharbia: c([['tanta', 'Tanta', 'طنطا'], ['mahalla', 'El Mahalla El Kubra', 'المحلة الكبرى'], ['kafr_el_zayat', 'Kafr El Zayat', 'كفر الزيات'], ['zefta', 'Zefta', 'زفتى'], ['samanoud', 'Samanoud', 'سمنود'], ['basyoun', 'Basyoun', 'بسيون'], ['qutur', 'Qutur', 'قطور'], ['el_santa', 'El Santa', 'السنطة']]),
    monufia: c([['shebin_el_kom', 'Shebin El Kom', 'شبين الكوم'], ['menouf', 'Menouf', 'منوف'], ['sadat_city', 'Sadat City', 'مدينة السادات'], ['ashmoun', 'Ashmoun', 'أشمون'], ['quesna', 'Quesna', 'قويسنا'], ['tala', 'Tala', 'تلا'], ['el_bagour', 'El Bagour', 'الباجور'], ['berket_el_sabaa', 'Berket El Sabaa', 'بركة السبع'], ['sers_el_layan', 'Sers El Layan', 'سرس الليان']]),
    kafr_el_sheikh: c([['kafr_el_sheikh_city', 'Kafr El Sheikh', 'كفر الشيخ'], ['desouk', 'Desouk', 'دسوق'], ['baltim', 'Baltim', 'بلطيم'], ['fuwwah', 'Fuwwah', 'فوه'], ['sidi_salem', 'Sidi Salem', 'سيدي سالم'], ['qallin', 'Qallin', 'قلين'], ['metoubes', 'Metoubes', 'مطوبس'], ['el_hamoul', 'El Hamoul', 'الحامول'], ['biyala', 'Biyala', 'بيلا']]),
    damietta: c([['damietta_city', 'Damietta', 'دمياط'], ['new_damietta', 'New Damietta', 'دمياط الجديدة'], ['ras_el_bar', 'Ras El Bar', 'رأس البر'], ['faraskur', 'Faraskur', 'فارسكور'], ['kafr_saad', 'Kafr Saad', 'كفر سعد'], ['el_zarqa', 'El Zarqa', 'الزرقا'], ['kafr_el_battikh', 'Kafr El Battikh', 'كفر البطيخ']]),
    port_said: c([['port_fouad', 'Port Fouad', 'بورفؤاد'], ['el_arab', 'El Arab', 'حي العرب'], ['el_sharq', 'El Sharq', 'حي الشرق'], ['el_manakh', 'El Manakh', 'حي المناخ'], ['el_dawahy', 'El Dawahy', 'حي الضواحي'], ['el_zohour', 'El Zohour', 'حي الزهور']]),
    ismailia: c([['ismailia_city', 'Ismailia', 'الإسماعيلية'], ['fayed', 'Fayed', 'فايد'], ['qantara_sharq', 'El Qantara Sharq', 'القنطرة شرق'], ['qantara_gharb', 'El Qantara Gharb', 'القنطرة غرب'], ['tal_el_kebir', 'El Tal El Kebir', 'التل الكبير'], ['abu_suwir', 'Abu Suwir', 'أبو صوير'], ['qassasin', 'El Qassasin', 'القصاصين']]),
    suez: c([['suez_city', 'Suez', 'السويس'], ['el_arbaeen', 'El Arbaeen', 'الأربعين'], ['ataqa', 'Ataqa', 'عتاقة'], ['el_ganayen', 'El Ganayen', 'الجناين'], ['suez_faisal', 'Faisal', 'حي فيصل']]),
    red_sea: c([['hurghada', 'Hurghada', 'الغردقة'], ['el_gouna', 'El Gouna', 'الجونة'], ['safaga', 'Safaga', 'سفاجا'], ['el_quseir', 'El Quseir', 'القصير'], ['marsa_alam', 'Marsa Alam', 'مرسى علم'], ['ras_gharib', 'Ras Gharib', 'رأس غارب'], ['shalateen', 'El Shalateen', 'الشلاتين']]),
    faiyum: c([['faiyum_city', 'Faiyum', 'الفيوم'], ['sinnuris', 'Sinnuris', 'سنورس'], ['ibsheway', 'Ibsheway', 'إبشواي'], ['itsa', 'Itsa', 'إطسا'], ['tamiya', 'Tamiya', 'طامية'], ['yousef_el_seddik', 'Yousef El Seddik', 'يوسف الصديق']]),
    beni_suef: c([['beni_suef_city', 'Beni Suef', 'بني سويف'], ['new_beni_suef', 'New Beni Suef', 'بني سويف الجديدة'], ['el_wasta', 'El Wasta', 'الواسطى'], ['nasser', 'Nasser', 'ناصر'], ['ihnasya', 'Ihnasya', 'إهناسيا'], ['beba', 'Beba', 'ببا'], ['el_fashn', 'El Fashn', 'الفشن'], ['somosta', 'Somosta', 'سمسطا']]),
    minya: c([['minya_city', 'Minya', 'المنيا'], ['new_minya', 'New Minya', 'المنيا الجديدة'], ['mallawi', 'Mallawi', 'ملوي'], ['samalut', 'Samalut', 'سمالوط'], ['maghagha', 'Maghagha', 'مغاغة'], ['beni_mazar', 'Beni Mazar', 'بني مزار'], ['abu_qurqas', 'Abu Qurqas', 'أبو قرقاص'], ['deir_mawas', 'Deir Mawas', 'دير مواس'], ['matai', 'Matai', 'مطاي'], ['el_edwa', 'El Edwa', 'العدوة']]),
    assiut: c([['assiut_city', 'Assiut', 'أسيوط'], ['dairut', 'Dairut', 'ديروط'], ['manfalut', 'Manfalut', 'منفلوط'], ['abnub', 'Abnub', 'أبنوب'], ['abu_tig', 'Abu Tig', 'أبوتيج'], ['el_qusiya', 'El Qusiya', 'القوصية'], ['sahel_selim', 'Sahel Selim', 'ساحل سليم'], ['el_badari', 'El Badari', 'البداري'], ['sidfa', 'Sidfa', 'صدفا'], ['el_ghanayem', 'El Ghanayem', 'الغنايم']]),
    sohag: c([['sohag_city', 'Sohag', 'سوهاج'], ['akhmim', 'Akhmim', 'أخميم'], ['girga', 'Girga', 'جرجا'], ['tahta', 'Tahta', 'طهطا'], ['el_maragha', 'El Maragha', 'المراغة'], ['el_balyana', 'El Balyana', 'البلينا'], ['tima', 'Tima', 'طما'], ['dar_el_salam', 'Dar El Salam', 'دار السلام'], ['el_monsha', 'El Monsha', 'المنشاة'], ['saqulta', 'Saqulta', 'ساقلتة']]),
    qena: c([['qena_city', 'Qena', 'قنا'], ['nag_hammadi', 'Nag Hammadi', 'نجع حمادي'], ['qus', 'Qus', 'قوص'], ['deshna', 'Deshna', 'دشنا'], ['abu_tesht', 'Abu Tesht', 'أبو تشت'], ['farshut', 'Farshut', 'فرشوط'], ['naqada', 'Naqada', 'نقادة'], ['qift', 'Qift', 'قفط'], ['el_waqf', 'El Waqf', 'الوقف']]),
    luxor: c([['luxor_city', 'Luxor', 'الأقصر'], ['esna', 'Esna', 'إسنا'], ['armant', 'Armant', 'أرمنت'], ['el_tod', 'El Tod', 'الطود'], ['el_bayadiya', 'El Bayadiya', 'البياضية'], ['el_qurna', 'El Qurna', 'القرنة'], ['el_zeiniya', 'El Zeiniya', 'الزينية']]),
    aswan: c([['aswan_city', 'Aswan', 'أسوان'], ['kom_ombo', 'Kom Ombo', 'كوم أمبو'], ['edfu', 'Edfu', 'إدفو'], ['daraw', 'Daraw', 'دراو'], ['nasr_el_nuba', 'Nasr El Nuba', 'نصر النوبة'], ['abu_simbel', 'Abu Simbel', 'أبو سمبل'], ['kalabsha', 'Kalabsha', 'كلابشة']]),
    new_valley: c([['kharga', 'El Kharga', 'الخارجة'], ['dakhla', 'El Dakhla', 'الداخلة'], ['farafra', 'El Farafra', 'الفرافرة'], ['paris', 'Paris', 'باريس'], ['balat', 'Balat', 'بلاط']]),
    north_sinai: c([['arish', 'El Arish', 'العريش'], ['sheikh_zuweid', 'Sheikh Zuweid', 'الشيخ زويد'], ['rafah', 'Rafah', 'رفح'], ['bir_al_abd', 'Bir El Abd', 'بئر العبد'], ['hasana', 'El Hasana', 'الحسنة'], ['nakhl', 'Nakhl', 'نخل']]),
    south_sinai: c([['el_tor', 'El Tor', 'الطور'], ['sharm_el_sheikh', 'Sharm El Sheikh', 'شرم الشيخ'], ['dahab', 'Dahab', 'دهب'], ['nuweiba', 'Nuweiba', 'نويبع'], ['taba', 'Taba', 'طابا'], ['saint_catherine', 'Saint Catherine', 'سانت كاترين'], ['ras_sedr', 'Ras Sedr', 'رأس سدر'], ['abu_rudeis', 'Abu Rudeis', 'أبو رديس']])
  };
  ICM.config.citiesOf = function (govId) { return ICM.config.CITIES[govId] || []; };
  ICM.config.cityLabel = function (govId, cityId) {
    var x = ICM.config.citiesOf(govId).filter(function (k) { return k.id === cityId; })[0];
    return x ? x : null;
  };
  /**
   * The city id for an address city written as an id or as its English or Arabic name
   * ("Dokki", "dokki", "الدقي"). null when it is not on the governorate's list.
   */
  ICM.config.cityIdOf = function (govId, text) {
    var s = String(text == null ? '' : text).trim().toLowerCase().replace(/\s+/g, ' ');
    if (!s) return null;
    var x = ICM.config.citiesOf(govId).filter(function (k) {
      return k.id === s || k.en.toLowerCase() === s || k.ar === s;
    })[0];
    return x ? x.id : null;
  };
})();
