/**
 * Dev helper: fills `translations` on the seeded demo data (matched by English name) so the
 * multi-language API can be tried locally, e.g. GET /api/restaurants?lang=hi.
 * Run with `npm run db:seed-translations`. Safe to re-run: it only overwrites `translations`.
 *
 * Coverage is deliberately uneven to show the per-field English fallback:
 *  - names / labels: all 10 languages
 *  - restaurant details and item descriptions: Hindi and Gujarati only
 */
import { prisma } from "../src/lib/prisma.js";

type Lang = "hi" | "ta" | "ml" | "or" | "gu" | "kn" | "bn" | "pa" | "as" | "mr";
type Names = Record<Lang, string>;
type Translations = Partial<Record<Lang, Record<string, string>>>;

const LANGS: Lang[] = ["hi", "ta", "ml", "or", "gu", "kn", "bn", "pa", "as", "mr"];

/** { hi: "…", ta: "…" } → { hi: { [field]: "…" }, ta: { [field]: "…" } } */
const asField = (field: string, names: Names, prefix = ""): Translations =>
  Object.fromEntries(LANGS.map((lang) => [lang, { [field]: `${prefix}${names[lang]}` }]));

/** Deep-merges per-language field maps. */
const merge = (...parts: Translations[]): Translations => {
  const out: Translations = {};
  for (const part of parts) for (const [lang, fields] of Object.entries(part) as [Lang, Record<string, string>][]) out[lang] = { ...out[lang], ...fields };
  return out;
};

// --- Restaurant categories (label) -----------------------------------------------------------
const RESTAURANT_CATEGORIES: Record<string, Names> = {
  "Fast Food": { hi: "फ़ास्ट फ़ूड", ta: "துரித உணவு", ml: "ഫാസ്റ്റ് ഫുഡ്", or: "ଫାଷ୍ଟ ଫୁଡ୍", gu: "ફાસ્ટ ફૂડ", kn: "ಫಾಸ್ಟ್ ಫುಡ್", bn: "ফাস্ট ফুড", pa: "ਫਾਸਟ ਫੂਡ", as: "ফাষ্ট ফুড", mr: "फास्ट फूड" },
  "South Indian": { hi: "दक्षिण भारतीय", ta: "தென்னிந்திய", ml: "ദക്ഷിണേന്ത്യൻ", or: "ଦକ୍ଷିଣ ଭାରତୀୟ", gu: "દક્ષિણ ભારતીય", kn: "ದಕ್ಷಿಣ ಭಾರತೀಯ", bn: "দক্ষিণ ভারতীয়", pa: "ਦੱਖਣ ਭਾਰਤੀ", as: "দক্ষিণ ভাৰতীয়", mr: "दाक्षिणात्य" },
  Cafe: { hi: "कैफ़े", ta: "கஃபே", ml: "കഫേ", or: "କାଫେ", gu: "કાફે", kn: "ಕೆಫೆ", bn: "ক্যাফে", pa: "ਕੈਫ਼ੇ", as: "কেফে", mr: "कॅफे" },
  "North Indian": { hi: "उत्तर भारतीय", ta: "வட இந்திய", ml: "ഉത്തരേന്ത്യൻ", or: "ଉତ୍ତର ଭାରତୀୟ", gu: "ઉત્તર ભારતીય", kn: "ಉತ್ತರ ಭಾರತೀಯ", bn: "উত্তর ভারতীয়", pa: "ਉੱਤਰ ਭਾਰਤੀ", as: "উত্তৰ ভাৰতীয়", mr: "उत्तर भारतीय" },
  "Pure Veg": { hi: "शुद्ध शाकाहारी", ta: "சுத்த சைவம்", ml: "ശുദ്ധ സസ്യാഹാരം", or: "ଶୁଦ୍ଧ ନିରାମିଷ", gu: "શુદ્ધ શાકાહારી", kn: "ಶುದ್ಧ ಸಸ್ಯಾಹಾರಿ", bn: "বিশুদ্ধ নিরামিষ", pa: "ਸ਼ੁੱਧ ਸ਼ਾਕਾਹਾਰੀ", as: "বিশুদ্ধ নিৰামিষ", mr: "शुद्ध शाकाहारी" },
};

// --- Menu categories (name) --------------------------------------------------------------------
const MENU_CATEGORIES: Record<string, Names> = {
  Recommended: { hi: "सुझाए गए", ta: "பரிந்துரைக்கப்பட்டவை", ml: "ശുപാർശ ചെയ്തവ", or: "ସୁପାରିଶ କରାଯାଇଥିବା", gu: "ભલામણ કરેલ", kn: "ಶಿಫಾರಸು ಮಾಡಿದವು", bn: "প্রস্তাবিত", pa: "ਸਿਫ਼ਾਰਸ਼ੀ", as: "পৰামৰ্শিত", mr: "शिफारस केलेले" },
  Beverages: { hi: "पेय पदार्थ", ta: "பானங்கள்", ml: "പാനീയങ്ങൾ", or: "ପାନୀୟ", gu: "પીણાં", kn: "ಪಾನೀಯಗಳು", bn: "পানীয়", pa: "ਪੀਣ ਵਾਲੇ ਪਦਾਰਥ", as: "পানীয়", mr: "पेये" },
  Breads: { hi: "रोटियाँ", ta: "ரொட்டிகள்", ml: "റൊട്ടികൾ", or: "ରୁଟି", gu: "રોટલી", kn: "ರೊಟ್ಟಿಗಳು", bn: "রুটি", pa: "ਰੋਟੀਆਂ", as: "ৰুটি", mr: "रोटी" },
  Starters: { hi: "स्टार्टर्स", ta: "ஸ்டார்ட்டர்கள்", ml: "സ്റ്റാർട്ടറുകൾ", or: "ଷ୍ଟାର୍ଟର୍", gu: "સ્ટાર્ટર્સ", kn: "ಸ್ಟಾರ್ಟರ್‌ಗಳು", bn: "স্টার্টার", pa: "ਸਟਾਰਟਰ", as: "ষ্টাৰ্টাৰ", mr: "स्टार्टर्स" },
  Snacks: { hi: "नाश्ता", ta: "சிற்றுண்டிகள்", ml: "ലഘുഭക്ഷണങ്ങൾ", or: "ଜଳଖିଆ", gu: "નાસ્તો", kn: "ತಿಂಡಿಗಳು", bn: "জলখাবার", pa: "ਸਨੈਕਸ", as: "জলপান", mr: "नाश्ता" },
  "South Indian": RESTAURANT_CATEGORIES["South Indian"],
};

// --- Menu items (name: all languages, description: hi + gu) -------------------------------------
const ITEM_NAMES: Record<string, Names> = {
  "Rava Uttapam": { hi: "रवा उत्तपम", ta: "ரவா ஊத்தப்பம்", ml: "റവ ഊത്തപ്പം", or: "ରବା ଉତ୍ତପମ୍", gu: "રવા ઉત્તપમ", kn: "ರವಾ ಉತ್ತಪ್ಪ", bn: "রাভা উত্তাপম", pa: "ਰਵਾ ਉਤਪਮ", as: "ৰাভা উত্তাপম", mr: "रवा उत्तपम" },
  "Idli Sambar": { hi: "इडली सांभर", ta: "இட்லி சாம்பார்", ml: "ഇഡ്ഡലി സാമ്പാർ", or: "ଇଡ଼ଲି ସମ୍ବର", gu: "ઇડલી સાંભાર", kn: "ಇಡ್ಲಿ ಸಾಂಬಾರ್", bn: "ইডলি সম্বর", pa: "ਇਡਲੀ ਸਾਂਬਰ", as: "ইডলি চাম্বাৰ", mr: "इडली सांबार" },
  "Masala Dosa": { hi: "मसाला डोसा", ta: "மசாலா தோசை", ml: "മസാല ദോശ", or: "ମସଲା ଦୋସା", gu: "મસાલા ઢોસા", kn: "ಮಸಾಲೆ ದೋಸೆ", bn: "মসলা দোসা", pa: "ਮਸਾਲਾ ਡੋਸਾ", as: "মছলা দোচা", mr: "मसाला डोसा" },
  "Gujarati Thali": { hi: "गुजराती थाली", ta: "குஜராத்தி தாலி", ml: "ഗുജറാത്തി താലി", or: "ଗୁଜରାଟୀ ଥାଳି", gu: "ગુજરાતી થાળી", kn: "ಗುಜರಾತಿ ಥಾಲಿ", bn: "গুজরাটি থালি", pa: "ਗੁਜਰਾਤੀ ਥਾਲੀ", as: "গুজৰাটী থালী", mr: "गुजराती थाळी" },
  "Paneer Butter Masala": { hi: "पनीर बटर मसाला", ta: "பனீர் பட்டர் மசாலா", ml: "പനീർ ബട്ടർ മസാല", or: "ପନୀର ବଟର ମସଲା", gu: "પનીર બટર મસાલા", kn: "ಪನೀರ್ ಬಟರ್ ಮಸಾಲಾ", bn: "পনির বাটার মসলা", pa: "ਪਨੀਰ ਬਟਰ ਮਸਾਲਾ", as: "পনীৰ বাটাৰ মছলা", mr: "पनीर बटर मसाला" },
  "Dal Makhani": { hi: "दाल मखनी", ta: "தால் மக்கனி", ml: "ദാൽ മഖനി", or: "ଡାଲି ମଖନୀ", gu: "દાલ મખની", kn: "ದಾಲ್ ಮಖನಿ", bn: "ডাল মাখানি", pa: "ਦਾਲ ਮੱਖਣੀ", as: "দাইল মাখনী", mr: "दाल मखनी" },
  "Cold Coffee": { hi: "कोल्ड कॉफ़ी", ta: "கோல்ட் காபி", ml: "കോൾഡ് കോഫി", or: "କୋଲ୍ଡ କଫି", gu: "કોલ્ડ કોફી", kn: "ಕೋಲ್ಡ್ ಕಾಫಿ", bn: "কোল্ড কফি", pa: "ਕੋਲਡ ਕੌਫ਼ੀ", as: "কল্ড কফি", mr: "कोल्ड कॉफी" },
  Cappuccino: { hi: "कैपुचीनो", ta: "கப்புசினோ", ml: "കപ്പുച്ചിനോ", or: "କାପୁଚିନୋ", gu: "કેપુચીનો", kn: "ಕ್ಯಾಪುಚಿನೊ", bn: "কাপুচিনো", pa: "ਕੈਪੂਚੀਨੋ", as: "কাপুচিনো", mr: "कॅपुचिनो" },
  "Veg Burger": { hi: "वेज बर्गर", ta: "வெஜ் பர்கர்", ml: "വെജ് ബർഗർ", or: "ଭେଜ୍ ବର୍ଗର", gu: "વેજ બર્ગર", kn: "ವೆಜ್ ಬರ್ಗರ್", bn: "ভেজ বার্গার", pa: "ਵੈਜ ਬਰਗਰ", as: "ভেজ বাৰ্গাৰ", mr: "व्हेज बर्गर" },
  "Tandoori Roti": { hi: "तंदूरी रोटी", ta: "தந்தூரி ரொட்டி", ml: "തന്തൂരി റൊട്ടി", or: "ତନ୍ଦୁରୀ ରୁଟି", gu: "તંદૂરી રોટી", kn: "ತಂದೂರಿ ರೊಟ್ಟಿ", bn: "তন্দুরি রুটি", pa: "ਤੰਦੂਰੀ ਰੋਟੀ", as: "তন্দুৰী ৰুটি", mr: "तंदूरी रोटी" },
  "Butter Naan": { hi: "बटर नान", ta: "பட்டர் நான்", ml: "ബട്ടർ നാൻ", or: "ବଟର ନାନ୍", gu: "બટર નાન", kn: "ಬಟರ್ ನಾನ್", bn: "বাটার নান", pa: "ਬਟਰ ਨਾਨ", as: "বাটাৰ নান", mr: "बटर नान" },
  "Paneer Tikka": { hi: "पनीर टिक्का", ta: "பனீர் டிக்கா", ml: "പനീർ ടിക്ക", or: "ପନୀର ଟିକ୍କା", gu: "પનીર ટિક્કા", kn: "ಪನೀರ್ ಟಿಕ್ಕಾ", bn: "পনির টিক্কা", pa: "ਪਨੀਰ ਟਿੱਕਾ", as: "পনীৰ টিক্কা", mr: "पनीर टिक्का" },
  "Veg Manchurian": { hi: "वेज मंचूरियन", ta: "வெஜ் மஞ்சூரியன்", ml: "വെജ് മഞ്ചൂരിയൻ", or: "ଭେଜ୍ ମଞ୍ଚୁରିଆନ୍", gu: "વેજ મંચુરિયન", kn: "ವೆಜ್ ಮಂಚೂರಿಯನ್", bn: "ভেজ মাঞ্চুরিয়ান", pa: "ਵੈਜ ਮੰਚੂਰੀਅਨ", as: "ভেজ মাঞ্চুৰিয়ান", mr: "व्हेज मंचुरियन" },
  "French Fries": { hi: "फ्रेंच फ्राइज़", ta: "பிரெஞ்சு ஃப்ரைஸ்", ml: "ഫ്രഞ്ച് ഫ്രൈസ്", or: "ଫ୍ରେଞ୍ଚ ଫ୍ରାଇଜ୍", gu: "ફ્રેન્ચ ફ્રાઈસ", kn: "ಫ್ರೆಂಚ್ ಫ್ರೈಸ್", bn: "ফ্রেঞ্চ ফ্রাই", pa: "ਫ੍ਰੈਂਚ ਫ੍ਰਾਈਜ਼", as: "ফ্ৰেঞ্চ ফ্ৰাইজ", mr: "फ्रेंच फ्राईज" },
  "Chicken Burger": { hi: "चिकन बर्गर", ta: "சிக்கன் பர்கர்", ml: "ചിക്കൻ ബർഗർ", or: "ଚିକେନ୍ ବର୍ଗର", gu: "ચિકન બર્ગર", kn: "ಚಿಕನ್ ಬರ್ಗರ್", bn: "চিকেন বার্গার", pa: "ਚਿਕਨ ਬਰਗਰ", as: "চিকেন বাৰ্গাৰ", mr: "चिकन बर्गर" },
};

const ITEM_DESCRIPTIONS: Record<string, { hi: string; gu: string }> = {
  "Rava Uttapam": { hi: "प्याज़ और टमाटर से सजा सूजी का पैनकेक।", gu: "ડુંગળી અને ટામેટાંથી સજાવેલ સોજીનો પેનકેક." },
  "Idli Sambar": { hi: "दाल के सांभर के साथ भाप में पकी चावल की इडली।", gu: "દાળના સાંભાર સાથે બાફેલી ચોખાની ઇડલી." },
  "Masala Dosa": { hi: "मसालेदार आलू से भरा कुरकुरा चावल का डोसा।", gu: "મસાલેદાર બટાકાથી ભરેલો કડક ચોખાનો ઢોસો." },
  "Gujarati Thali": { hi: "मौसमी शाक, दाल और रोटली के साथ अनलिमिटेड थाली।", gu: "મોસમી શાક, દાળ અને રોટલી સાથે અનલિમિટેડ થાળી." },
  "Dal Makhani": { hi: "मलाई के साथ धीमी आँच पर पकी काली दाल।", gu: "મલાઈ સાથે ધીમા તાપે રાંધેલી કાળી દાળ." },
  "Paneer Butter Masala": { hi: "टमाटर-मक्खन की गाढ़ी ग्रेवी में पनीर के टुकड़े।", gu: "ટામેટાં-માખણની ઘટ્ટ ગ્રેવીમાં પનીરના ટુકડા." },
  "Tandoori Roti": { hi: "तंदूर में पकी गेहूँ की रोटी।", gu: "તંદૂરમાં શેકેલી ઘઉંની રોટી." },
  "Butter Naan": { hi: "मक्खन लगी खमीरी रोटी।", gu: "માખણ લગાવેલી ખમીરી નાન." },
  "Paneer Tikka": { hi: "मसालेदार दही में मैरीनेट कर ग्रिल किया पनीर।", gu: "મસાલેદાર દહીંમાં મેરીનેટ કરીને શેકેલું પનીર." },
  "Veg Manchurian": { hi: "खट्टी-मीठी चटनी में लिपटे कुरकुरे सब्ज़ी के गोले।", gu: "ખાટી-મીઠી ચટણીમાં લપેટેલા કડક શાકભાજીના ગોળા." },
  "Cold Coffee": { hi: "आइसक्रीम के साथ ब्लेंड की गई ठंडी कॉफ़ी।", gu: "આઇસક્રીમ સાથે બ્લેન્ડ કરેલી ઠંડી કોફી." },
  Cappuccino: { hi: "भाप वाले दूध के झाग के साथ एस्प्रेसो।", gu: "વરાળવાળા દૂધના ફીણ સાથે એસ્પ્રેસો." },
  "Veg Burger": { hi: "लेट्यूस और चीज़ के साथ ग्रिल की हुई वेज पैटी।", gu: "લેટ્યુસ અને ચીઝ સાથે શેકેલી વેજ પેટી." },
  "French Fries": { hi: "कुरकुरे नमकीन आलू फ्राइज़।", gu: "કડક મીઠાવાળી બટાકાની ફ્રાઈસ." },
  "Chicken Burger": { hi: "लेट्यूस और मेयो के साथ ग्रिल की हुई चिकन पैटी।", gu: "લેટ્યુસ અને મેયો સાથે શેકેલી ચિકન પેટી." },
};

// --- Restaurants (name: all languages, other fields: hi + gu) -----------------------------------
const AHMEDABAD = { hi: { city: "अहमदाबाद", state: "गुजरात" }, gu: { city: "અમદાવાદ", state: "ગુજરાત" } };

const RESTAURANTS: Record<string, { names: Names; hi: Record<string, string>; gu: Record<string, string> }> = {
  "Shree Shyam Restaurant": {
    names: { hi: "श्री श्याम रेस्टोरेंट", ta: "ஸ்ரீ ஷ்யாம் உணவகம்", ml: "ശ്രീ ശ്യാം റെസ്റ്റോറന്റ്", or: "ଶ୍ରୀ ଶ୍ୟାମ ରେଷ୍ଟୁରାଣ୍ଟ", gu: "શ્રી શ્યામ રેસ્ટોરન્ટ", kn: "ಶ್ರೀ ಶ್ಯಾಮ್ ರೆಸ್ಟೋರೆಂಟ್", bn: "শ্রী শ্যাম রেস্তোরাঁ", pa: "ਸ਼੍ਰੀ ਸ਼ਿਆਮ ਰੈਸਟੋਰੈਂਟ", as: "শ্ৰী শ্যাম ৰেষ্টুৰেণ্ট", mr: "श्री श्याम रेस्टॉरंट" },
    hi: { cuisineLabel: "शुद्ध शाकाहारी • उत्तर भारतीय • चाइनीज़", about: "उत्तर भारतीय थाली और चाइनीज़ स्टार्टर्स के लिए मशहूर एक आरामदायक शुद्ध शाकाहारी फ़ैमिली रेस्टोरेंट।", offerText: "50% छूट", offerSubText: "पहले ऑर्डर पर ₹100 तक", addressLine: "मंदिर रोड, मुख्य द्वार के पास" },
    gu: { cuisineLabel: "શુદ્ધ શાકાહારી • ઉત્તર ભારતીય • ચાઇનીઝ", about: "ઉત્તર ભારતીય થાળી અને ચાઇનીઝ સ્ટાર્ટર્સ માટે જાણીતું આરામદાયક શુદ્ધ શાકાહારી ફેમિલી રેસ્ટોરન્ટ.", offerText: "50% છૂટ", offerSubText: "પહેલા ઓર્ડર પર ₹100 સુધી", addressLine: "મંદિર રોડ, મુખ્ય દ્વાર પાસે" },
  },
  "Bites & Brews Cafe": {
    names: { hi: "बाइट्स एंड ब्रूज़ कैफ़े", ta: "பைட்ஸ் & ப்ரூஸ் கஃபே", ml: "ബൈറ്റ്സ് & ബ്രൂസ് കഫേ", or: "ବାଇଟ୍ସ ଆଣ୍ଡ ବ୍ରୁଜ୍ କାଫେ", gu: "બાઇટ્સ એન્ડ બ્રૂઝ કાફે", kn: "ಬೈಟ್ಸ್ & ಬ್ರೂಸ್ ಕೆಫೆ", bn: "বাইটস অ্যান্ড ব্রুজ ক্যাফে", pa: "ਬਾਈਟਸ ਐਂਡ ਬਰੂਜ਼ ਕੈਫ਼ੇ", as: "বাইটছ এণ্ড ব্ৰুজ কেফে", mr: "बाइट्स अँड ब्रूज कॅफे" },
    hi: { cuisineLabel: "कैफ़े • फ़ास्ट फ़ूड • कॉन्टिनेंटल", about: "दिनभर नाश्ता, बर्गर और स्पेशलिटी कॉफ़ी परोसने वाला एक कैज़ुअल कैफ़े।", offerText: "फ़्लैट 15% छूट", offerSubText: "सभी पेय पदार्थों पर", addressLine: "एसजी हाईवे, इस्कॉन क्रॉस रोड के पास" },
    gu: { cuisineLabel: "કાફે • ફાસ્ટ ફૂડ • કોન્ટિનેન્ટલ", about: "આખો દિવસ નાસ્તો, બર્ગર અને સ્પેશિયાલિટી કોફી પીરસતું કેઝ્યુઅલ કાફે.", offerText: "ફ્લેટ 15% છૂટ", offerSubText: "બધાં પીણાં પર", addressLine: "એસજી હાઇવે, ઇસ્કોન ક્રોસ રોડ પાસે" },
  },
  "Annapurna Pure Veg": {
    names: { hi: "अन्नपूर्णा प्योर वेज", ta: "அன்னபூர்ணா ப்யூர் வெஜ்", ml: "അന്നപൂർണ്ണ പ്യുവർ വെജ്", or: "ଅନ୍ନପୂର୍ଣ୍ଣା ପ୍ୟୋର ଭେଜ୍", gu: "અન્નપૂર્ણા પ્યોર વેજ", kn: "ಅನ್ನಪೂರ್ಣ ಪ್ಯೂರ್ ವೆಜ್", bn: "অন্নপূর্ণা পিওর ভেজ", pa: "ਅੰਨਪੂਰਨਾ ਪਿਓਰ ਵੈਜ", as: "অন্নপূৰ্ণা পিউৰ ভেজ", mr: "अन्नपूर्णा प्युअर व्हेज" },
    hi: { cuisineLabel: "शुद्ध शाकाहारी • दक्षिण भारतीय • गुजराती", about: "उजले, परिवार-अनुकूल माहौल में दक्षिण भारतीय और गुजराती शाकाहारी व्यंजन।", offerText: "20% छूट", offerSubText: "₹299 से ऊपर के ऑर्डर पर", addressLine: "सीजी रोड, पंचवटी सर्कल के पास" },
    gu: { cuisineLabel: "શુદ્ધ શાકાહારી • દક્ષિણ ભારતીય • ગુજરાતી", about: "તેજસ્વી, પરિવાર-અનુકૂળ વાતાવરણમાં દક્ષિણ ભારતીય અને ગુજરાતી શાકાહારી વાનગીઓ.", offerText: "20% છૂટ", offerSubText: "₹299 થી વધુના ઓર્ડર પર", addressLine: "સીજી રોડ, પંચવટી સર્કલ પાસે" },
  },
  // Test restaurants: only the name, in Hindi and Gujarati — everything else falls back to English.
  "[TEST] Demo Veg Restaurant": { names: { hi: "[TEST] डेमो वेज रेस्टोरेंट", gu: "[TEST] ડેમો વેજ રેસ્ટોરન્ટ" } as Names, hi: {}, gu: {} },
  "[TEST] Demo Cafe": { names: { hi: "[TEST] डेमो कैफ़े", gu: "[TEST] ડેમો કાફે" } as Names, hi: {}, gu: {} },
};

const TEST_PREFIX = "[TEST] ";

const run = async () => {
  const counts = { restaurants: 0, restaurantCategories: 0, menuCategories: 0, menuItems: 0 };
  const skipped: string[] = [];

  for (const [name, data] of Object.entries(RESTAURANTS)) {
    const names = Object.fromEntries(Object.entries(data.names).map(([lang, value]) => [lang, { name: value }])) as Translations;
    const isTest = name.startsWith(TEST_PREFIX);
    const translations = merge(names, { hi: data.hi, gu: data.gu }, isTest ? {} : AHMEDABAD);
    const result = await prisma.restaurant.updateMany({ where: { name }, data: { translations } });
    if (result.count) counts.restaurants += result.count; else skipped.push(`restaurant "${name}"`);
  }

  for (const [label, names] of Object.entries(RESTAURANT_CATEGORIES)) {
    const result = await prisma.restaurantCategory.updateMany({ where: { label }, data: { translations: asField("label", names) } });
    if (result.count) counts.restaurantCategories += result.count; else skipped.push(`category "${label}"`);
  }

  for (const [name, names] of Object.entries(MENU_CATEGORIES)) {
    const result = await prisma.menuCategory.updateMany({ where: { name }, data: { translations: asField("name", names) } });
    if (result.count) counts.menuCategories += result.count; else skipped.push(`menu category "${name}"`);
  }

  // Items are matched with and without the "[TEST] " prefix the demo data uses.
  for (const [name, names] of Object.entries(ITEM_NAMES)) {
    const description = ITEM_DESCRIPTIONS[name];
    const real = merge(asField("name", names), description ? { hi: { description: description.hi }, gu: { description: description.gu } } : {});
    const a = await prisma.menuItem.updateMany({ where: { name }, data: { translations: real } });
    const b = await prisma.menuItem.updateMany({ where: { name: `${TEST_PREFIX}${name}` }, data: { translations: asField("name", names, TEST_PREFIX) } });
    if (a.count + b.count) counts.menuItems += a.count + b.count; else skipped.push(`menu item "${name}"`);
  }

  console.log("Translations written:", counts);
  if (skipped.length) console.log("Not found (skipped):", skipped.join(", "));
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
