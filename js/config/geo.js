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
    { id: 'aswan', en: 'Aswan', ar: 'أسوان', zone: 'upper', code: '28', lat: 24.0889, lng: 32.8998 }
  ];
})();
