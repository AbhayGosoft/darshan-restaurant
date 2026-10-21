import type { BookingStatus, CancellationReason } from "../../generated/prisma/enums.js";
import type { Language } from "./languages.js";

export type NotificationEvent =
  | "placed"
  | "modified"
  | "cancelled"
  | "cancelledByRestaurant"
  | "acknowledged"
  | "preparing"
  | "ready"
  | "completed"
  | "rejected"
  | "reminder";

/** Values interpolated into notification text. `restaurant` is already in the customer's language. */
export type NotificationVars = {
  orderId: string;
  restaurant: string;
  /** "1:30 PM" */
  time: string;
  people: number;
  amount: number;
  reason?: string | null;
};

type Messages = {
  status: Record<BookingStatus, string>;
  cancellationReason: Record<CancellationReason, string>;
  notifications: Record<NotificationEvent, { title: string; body: (v: NotificationVars) => string }>;
};

// Non-English copy was machine-assisted; have a native speaker review it before relying on it.
const MESSAGES: Record<Language, Messages> = {
  en: {
    status: { UPCOMING: "Order placed", ACKNOWLEDGED: "Accepted", PREPARING: "Preparing", READY: "Ready", COMPLETED: "Completed", CANCELLED: "Cancelled", REJECTED: "Rejected" },
    cancellationReason: { CHANGE_OF_PLANS: "Change of plans", BOOKED_BY_MISTAKE: "Booked by mistake", FOUND_BETTER_OPTION: "Found a better option", RESTAURANT_NOT_RESPONDING: "Restaurant not responding", OTHER: "Other" },
    notifications: {
      placed: { title: "Order placed", body: (v) => `Your order ${v.orderId} at ${v.restaurant} is placed for arrival at ${v.time} today. We'll let you know once the restaurant accepts it.` },
      modified: { title: "Order updated", body: (v) => `Your order ${v.orderId} is now for ${v.people} ${v.people === 1 ? "person" : "people"}, arriving at ${v.time} today.` },
      cancelled: { title: "Order cancelled", body: (v) => `Your order ${v.orderId} has been cancelled.` },
      cancelledByRestaurant: { title: "Order cancelled", body: (v) => `Your order ${v.orderId} has been cancelled by the restaurant. Your payment of ₹${v.amount} is eligible for a full refund.` },
      acknowledged: { title: "Order accepted", body: (v) => `${v.restaurant} has accepted your order ${v.orderId}. See you at ${v.time}!` },
      preparing: { title: "Your food is being prepared", body: (v) => `${v.restaurant} has started preparing your order ${v.orderId}.` },
      ready: { title: "Your food is ready", body: (v) => `Your order ${v.orderId} at ${v.restaurant} is ready.` },
      completed: { title: "Order completed", body: (v) => `Thanks for ordering from ${v.restaurant}! Your order ${v.orderId} is complete.` },
      rejected: { title: "Order rejected", body: (v) => `${v.restaurant} couldn't accept your order ${v.orderId}.${v.reason ? ` Reason: ${v.reason}.` : ""} Your payment of ₹${v.amount} is eligible for a full refund.` },
      reminder: { title: "Your order is coming up", body: (v) => `Reminder: you're expected at ${v.restaurant} at ${v.time} today for order ${v.orderId}.` },
    },
  },
  hi: {
    status: { UPCOMING: "ऑर्डर दिया गया", ACKNOWLEDGED: "स्वीकार किया गया", PREPARING: "बन रहा है", READY: "तैयार है", COMPLETED: "पूरा हुआ", CANCELLED: "रद्द किया गया", REJECTED: "अस्वीकार किया गया" },
    cancellationReason: { CHANGE_OF_PLANS: "योजना में बदलाव", BOOKED_BY_MISTAKE: "गलती से बुक हो गया", FOUND_BETTER_OPTION: "बेहतर विकल्प मिल गया", RESTAURANT_NOT_RESPONDING: "रेस्टोरेंट जवाब नहीं दे रहा", OTHER: "अन्य" },
    notifications: {
      placed: { title: "ऑर्डर दिया गया", body: (v) => `${v.restaurant} पर आपका ऑर्डर ${v.orderId} आज ${v.time} बजे पहुँचने के लिए दिया गया है। रेस्टोरेंट के स्वीकार करते ही हम आपको बताएँगे।` },
      modified: { title: "ऑर्डर अपडेट किया गया", body: (v) => `आपका ऑर्डर ${v.orderId} अब ${v.people} लोगों के लिए है, आज ${v.time} बजे पहुँचना है।` },
      cancelled: { title: "ऑर्डर रद्द किया गया", body: (v) => `आपका ऑर्डर ${v.orderId} रद्द कर दिया गया है।` },
      cancelledByRestaurant: { title: "ऑर्डर रद्द किया गया", body: (v) => `आपका ऑर्डर ${v.orderId} रेस्टोरेंट द्वारा रद्द कर दिया गया है। आपका ₹${v.amount} का भुगतान पूरे रिफंड के लिए योग्य है।` },
      acknowledged: { title: "ऑर्डर स्वीकार किया गया", body: (v) => `${v.restaurant} ने आपका ऑर्डर ${v.orderId} स्वीकार कर लिया है। ${v.time} बजे मिलते हैं!` },
      preparing: { title: "आपका खाना बन रहा है", body: (v) => `${v.restaurant} ने आपका ऑर्डर ${v.orderId} बनाना शुरू कर दिया है।` },
      ready: { title: "आपका खाना तैयार है", body: (v) => `${v.restaurant} पर आपका ऑर्डर ${v.orderId} तैयार है।` },
      completed: { title: "ऑर्डर पूरा हुआ", body: (v) => `${v.restaurant} से ऑर्डर करने के लिए धन्यवाद! आपका ऑर्डर ${v.orderId} पूरा हो गया है।` },
      rejected: { title: "ऑर्डर अस्वीकार किया गया", body: (v) => `${v.restaurant} आपका ऑर्डर ${v.orderId} स्वीकार नहीं कर सका।${v.reason ? ` कारण: ${v.reason}।` : ""} आपका ₹${v.amount} का भुगतान पूरे रिफंड के लिए योग्य है।` },
      reminder: { title: "आपके ऑर्डर का समय नज़दीक है", body: (v) => `याद दिलाना: ऑर्डर ${v.orderId} के लिए आज ${v.time} बजे ${v.restaurant} पर आपका इंतज़ार है।` },
    },
  },
  ta: {
    status: { UPCOMING: "ஆர்டர் செய்யப்பட்டது", ACKNOWLEDGED: "ஏற்கப்பட்டது", PREPARING: "தயாராகிறது", READY: "தயார்", COMPLETED: "நிறைவடைந்தது", CANCELLED: "ரத்து செய்யப்பட்டது", REJECTED: "நிராகரிக்கப்பட்டது" },
    cancellationReason: { CHANGE_OF_PLANS: "திட்டம் மாறியது", BOOKED_BY_MISTAKE: "தவறுதலாக முன்பதிவு செய்யப்பட்டது", FOUND_BETTER_OPTION: "சிறந்த விருப்பம் கிடைத்தது", RESTAURANT_NOT_RESPONDING: "உணவகம் பதிலளிக்கவில்லை", OTHER: "மற்றவை" },
    notifications: {
      placed: { title: "ஆர்டர் செய்யப்பட்டது", body: (v) => `${v.restaurant}-இல் உங்கள் ஆர்டர் ${v.orderId} இன்று ${v.time}-க்கு வருகைக்காக செய்யப்பட்டுள்ளது. உணவகம் ஏற்றுக்கொண்டவுடன் உங்களுக்குத் தெரிவிப்போம்.` },
      modified: { title: "ஆர்டர் புதுப்பிக்கப்பட்டது", body: (v) => `உங்கள் ஆர்டர் ${v.orderId} இப்போது ${v.people} பேருக்கானது, இன்று ${v.time}-க்கு வருகை.` },
      cancelled: { title: "ஆர்டர் ரத்து செய்யப்பட்டது", body: (v) => `உங்கள் ஆர்டர் ${v.orderId} ரத்து செய்யப்பட்டது.` },
      cancelledByRestaurant: { title: "ஆர்டர் ரத்து செய்யப்பட்டது", body: (v) => `உங்கள் ஆர்டர் ${v.orderId} உணவகத்தால் ரத்து செய்யப்பட்டது. நீங்கள் செலுத்திய ₹${v.amount} முழுமையாகத் திரும்பப் பெறத் தகுதியானது.` },
      acknowledged: { title: "ஆர்டர் ஏற்றுக்கொள்ளப்பட்டது", body: (v) => `${v.restaurant} உங்கள் ஆர்டர் ${v.orderId}-ஐ ஏற்றுக்கொண்டது. ${v.time}-க்கு சந்திப்போம்!` },
      preparing: { title: "உங்கள் உணவு தயாராகிறது", body: (v) => `${v.restaurant} உங்கள் ஆர்டர் ${v.orderId}-ஐத் தயாரிக்கத் தொடங்கியுள்ளது.` },
      ready: { title: "உங்கள் உணவு தயார்", body: (v) => `${v.restaurant}-இல் உங்கள் ஆர்டர் ${v.orderId} தயாராக உள்ளது.` },
      completed: { title: "ஆர்டர் நிறைவடைந்தது", body: (v) => `${v.restaurant}-இல் ஆர்டர் செய்ததற்கு நன்றி! உங்கள் ஆர்டர் ${v.orderId} நிறைவடைந்தது.` },
      rejected: { title: "ஆர்டர் நிராகரிக்கப்பட்டது", body: (v) => `${v.restaurant} உங்கள் ஆர்டர் ${v.orderId}-ஐ ஏற்க முடியவில்லை.${v.reason ? ` காரணம்: ${v.reason}.` : ""} நீங்கள் செலுத்திய ₹${v.amount} முழுமையாகத் திரும்பப் பெறத் தகுதியானது.` },
      reminder: { title: "உங்கள் ஆர்டர் நேரம் நெருங்குகிறது", body: (v) => `நினைவூட்டல்: ஆர்டர் ${v.orderId}-க்காக இன்று ${v.time}-க்கு ${v.restaurant}-இல் நீங்கள் எதிர்பார்க்கப்படுகிறீர்கள்.` },
    },
  },
  ml: {
    status: { UPCOMING: "ഓർഡർ നൽകി", ACKNOWLEDGED: "സ്വീകരിച്ചു", PREPARING: "തയ്യാറാക്കുന്നു", READY: "തയ്യാർ", COMPLETED: "പൂർത്തിയായി", CANCELLED: "റദ്ദാക്കി", REJECTED: "നിരസിച്ചു" },
    cancellationReason: { CHANGE_OF_PLANS: "പ്ലാൻ മാറി", BOOKED_BY_MISTAKE: "അബദ്ധത്തിൽ ബുക്ക് ചെയ്തു", FOUND_BETTER_OPTION: "മികച്ച ഓപ്ഷൻ ലഭിച്ചു", RESTAURANT_NOT_RESPONDING: "റെസ്റ്റോറന്റ് പ്രതികരിക്കുന്നില്ല", OTHER: "മറ്റുള്ളവ" },
    notifications: {
      placed: { title: "ഓർഡർ നൽകി", body: (v) => `${v.restaurant}-ൽ നിങ്ങളുടെ ഓർഡർ ${v.orderId} ഇന്ന് ${v.time}-ന് എത്തുന്നതിനായി നൽകിയിരിക്കുന്നു. റെസ്റ്റോറന്റ് സ്വീകരിച്ചാലുടൻ ഞങ്ങൾ അറിയിക്കാം.` },
      modified: { title: "ഓർഡർ പുതുക്കി", body: (v) => `നിങ്ങളുടെ ഓർഡർ ${v.orderId} ഇപ്പോൾ ${v.people} പേർക്കാണ്, ഇന്ന് ${v.time}-ന് എത്തും.` },
      cancelled: { title: "ഓർഡർ റദ്ദാക്കി", body: (v) => `നിങ്ങളുടെ ഓർഡർ ${v.orderId} റദ്ദാക്കിയിരിക്കുന്നു.` },
      cancelledByRestaurant: { title: "ഓർഡർ റദ്ദാക്കി", body: (v) => `നിങ്ങളുടെ ഓർഡർ ${v.orderId} റെസ്റ്റോറന്റ് റദ്ദാക്കി. നിങ്ങൾ അടച്ച ₹${v.amount} പൂർണ്ണ റീഫണ്ടിന് അർഹമാണ്.` },
      acknowledged: { title: "ഓർഡർ സ്വീകരിച്ചു", body: (v) => `${v.restaurant} നിങ്ങളുടെ ഓർഡർ ${v.orderId} സ്വീകരിച്ചു. ${v.time}-ന് കാണാം!` },
      preparing: { title: "നിങ്ങളുടെ ഭക്ഷണം തയ്യാറാക്കുന്നു", body: (v) => `${v.restaurant} നിങ്ങളുടെ ഓർഡർ ${v.orderId} തയ്യാറാക്കാൻ തുടങ്ങി.` },
      ready: { title: "നിങ്ങളുടെ ഭക്ഷണം തയ്യാർ", body: (v) => `${v.restaurant}-ൽ നിങ്ങളുടെ ഓർഡർ ${v.orderId} തയ്യാറാണ്.` },
      completed: { title: "ഓർഡർ പൂർത്തിയായി", body: (v) => `${v.restaurant}-ൽ നിന്ന് ഓർഡർ ചെയ്തതിന് നന്ദി! നിങ്ങളുടെ ഓർഡർ ${v.orderId} പൂർത്തിയായി.` },
      rejected: { title: "ഓർഡർ നിരസിച്ചു", body: (v) => `${v.restaurant}-ന് നിങ്ങളുടെ ഓർഡർ ${v.orderId} സ്വീകരിക്കാൻ കഴിഞ്ഞില്ല.${v.reason ? ` കാരണം: ${v.reason}.` : ""} നിങ്ങൾ അടച്ച ₹${v.amount} പൂർണ്ണ റീഫണ്ടിന് അർഹമാണ്.` },
      reminder: { title: "നിങ്ങളുടെ ഓർഡർ സമയം അടുത്തു", body: (v) => `ഓർമ്മപ്പെടുത്തൽ: ഓർഡർ ${v.orderId}-നായി ഇന്ന് ${v.time}-ന് ${v.restaurant}-ൽ നിങ്ങളെ പ്രതീക്ഷിക്കുന്നു.` },
    },
  },
  or: {
    status: { UPCOMING: "ଅର୍ଡର ଦିଆଗଲା", ACKNOWLEDGED: "ଗ୍ରହଣ କରାଗଲା", PREPARING: "ପ୍ରସ୍ତୁତ ହେଉଛି", READY: "ପ୍ରସ୍ତୁତ", COMPLETED: "ସମ୍ପୂର୍ଣ୍ଣ", CANCELLED: "ବାତିଲ", REJECTED: "ପ୍ରତ୍ୟାଖ୍ୟାତ" },
    cancellationReason: { CHANGE_OF_PLANS: "ଯୋଜନା ବଦଳିଲା", BOOKED_BY_MISTAKE: "ଭୁଲରେ ବୁକ୍ ହେଲା", FOUND_BETTER_OPTION: "ଭଲ ବିକଳ୍ପ ମିଳିଲା", RESTAURANT_NOT_RESPONDING: "ରେଷ୍ଟୁରାଣ୍ଟ ଉତ୍ତର ଦେଉନାହିଁ", OTHER: "ଅନ୍ୟ" },
    notifications: {
      placed: { title: "ଅର୍ଡର ଦିଆଗଲା", body: (v) => `${v.restaurant}ରେ ଆପଣଙ୍କ ଅର୍ଡର ${v.orderId} ଆଜି ${v.time}ରେ ପହଞ୍ଚିବା ପାଇଁ ଦିଆଯାଇଛି। ରେଷ୍ଟୁରାଣ୍ଟ ଏହାକୁ ଗ୍ରହଣ କଲେ ଆମେ ଆପଣଙ୍କୁ ଜଣାଇବୁ।` },
      modified: { title: "ଅର୍ଡର ଅପଡେଟ୍ ହେଲା", body: (v) => `ଆପଣଙ୍କ ଅର୍ଡର ${v.orderId} ବର୍ତ୍ତମାନ ${v.people} ଜଣଙ୍କ ପାଇଁ, ଆଜି ${v.time}ରେ ପହଞ୍ଚିବେ।` },
      cancelled: { title: "ଅର୍ଡର ବାତିଲ ହେଲା", body: (v) => `ଆପଣଙ୍କ ଅର୍ଡର ${v.orderId} ବାତିଲ କରାଯାଇଛି।` },
      cancelledByRestaurant: { title: "ଅର୍ଡର ବାତିଲ ହେଲା", body: (v) => `ଆପଣଙ୍କ ଅର୍ଡର ${v.orderId} ରେଷ୍ଟୁରାଣ୍ଟ ଦ୍ୱାରା ବାତିଲ କରାଯାଇଛି। ଆପଣଙ୍କ ₹${v.amount} ପେମେଣ୍ଟ ସମ୍ପୂର୍ଣ୍ଣ ଫେରସ୍ତ ପାଇଁ ଯୋଗ୍ୟ।` },
      acknowledged: { title: "ଅର୍ଡର ଗ୍ରହଣ କରାଗଲା", body: (v) => `${v.restaurant} ଆପଣଙ୍କ ଅର୍ଡର ${v.orderId} ଗ୍ରହଣ କରିଛି। ${v.time}ରେ ଦେଖା ହେବ!` },
      preparing: { title: "ଆପଣଙ୍କ ଖାଦ୍ୟ ପ୍ରସ୍ତୁତ ହେଉଛି", body: (v) => `${v.restaurant} ଆପଣଙ୍କ ଅର୍ଡର ${v.orderId} ପ୍ରସ୍ତୁତ କରିବା ଆରମ୍ଭ କରିଛି।` },
      ready: { title: "ଆପଣଙ୍କ ଖାଦ୍ୟ ପ୍ରସ୍ତୁତ", body: (v) => `${v.restaurant}ରେ ଆପଣଙ୍କ ଅର୍ଡର ${v.orderId} ପ୍ରସ୍ତୁତ।` },
      completed: { title: "ଅର୍ଡର ସମ୍ପୂର୍ଣ୍ଣ ହେଲା", body: (v) => `${v.restaurant}ରୁ ଅର୍ଡର କରିଥିବାରୁ ଧନ୍ୟବାଦ! ଆପଣଙ୍କ ଅର୍ଡର ${v.orderId} ସମ୍ପୂର୍ଣ୍ଣ ହୋଇଛି।` },
      rejected: { title: "ଅର୍ଡର ପ୍ରତ୍ୟାଖ୍ୟାନ ହେଲା", body: (v) => `${v.restaurant} ଆପଣଙ୍କ ଅର୍ଡର ${v.orderId} ଗ୍ରହଣ କରିପାରିଲା ନାହିଁ।${v.reason ? ` କାରଣ: ${v.reason}।` : ""} ଆପଣଙ୍କ ₹${v.amount} ପେମେଣ୍ଟ ସମ୍ପୂର୍ଣ୍ଣ ଫେରସ୍ତ ପାଇଁ ଯୋଗ୍ୟ।` },
      reminder: { title: "ଆପଣଙ୍କ ଅର୍ଡର ସମୟ ପାଖେଇ ଆସୁଛି", body: (v) => `ସ୍ମାରକ: ଅର୍ଡର ${v.orderId} ପାଇଁ ଆଜି ${v.time}ରେ ${v.restaurant}ରେ ଆପଣଙ୍କୁ ଆଶା କରାଯାଉଛି।` },
    },
  },
  gu: {
    status: { UPCOMING: "ઓર્ડર આપ્યો", ACKNOWLEDGED: "સ્વીકાર્યો", PREPARING: "બની રહ્યું છે", READY: "તૈયાર", COMPLETED: "પૂર્ણ", CANCELLED: "રદ", REJECTED: "નકાર્યો" },
    cancellationReason: { CHANGE_OF_PLANS: "યોજનામાં ફેરફાર", BOOKED_BY_MISTAKE: "ભૂલથી બુક થયું", FOUND_BETTER_OPTION: "વધુ સારો વિકલ્પ મળ્યો", RESTAURANT_NOT_RESPONDING: "રેસ્ટોરન્ટ જવાબ આપતું નથી", OTHER: "અન્ય" },
    notifications: {
      placed: { title: "ઓર્ડર આપવામાં આવ્યો", body: (v) => `${v.restaurant} પર તમારો ઓર્ડર ${v.orderId} આજે ${v.time} વાગ્યે પહોંચવા માટે આપવામાં આવ્યો છે. રેસ્ટોરન્ટ તેને સ્વીકારશે ત્યારે અમે તમને જણાવીશું.` },
      modified: { title: "ઓર્ડર અપડેટ થયો", body: (v) => `તમારો ઓર્ડર ${v.orderId} હવે ${v.people} લોકો માટે છે, આજે ${v.time} વાગ્યે પહોંચવાનું છે.` },
      cancelled: { title: "ઓર્ડર રદ થયો", body: (v) => `તમારો ઓર્ડર ${v.orderId} રદ કરવામાં આવ્યો છે.` },
      cancelledByRestaurant: { title: "ઓર્ડર રદ થયો", body: (v) => `તમારો ઓર્ડર ${v.orderId} રેસ્ટોરન્ટ દ્વારા રદ કરવામાં આવ્યો છે. તમારી ₹${v.amount} ની ચુકવણી સંપૂર્ણ રિફંડ માટે પાત્ર છે.` },
      acknowledged: { title: "ઓર્ડર સ્વીકારાયો", body: (v) => `${v.restaurant} એ તમારો ઓર્ડર ${v.orderId} સ્વીકારી લીધો છે. ${v.time} વાગ્યે મળીએ!` },
      preparing: { title: "તમારું ભોજન બની રહ્યું છે", body: (v) => `${v.restaurant} એ તમારો ઓર્ડર ${v.orderId} બનાવવાનું શરૂ કર્યું છે.` },
      ready: { title: "તમારું ભોજન તૈયાર છે", body: (v) => `${v.restaurant} પર તમારો ઓર્ડર ${v.orderId} તૈયાર છે.` },
      completed: { title: "ઓર્ડર પૂર્ણ થયો", body: (v) => `${v.restaurant} માંથી ઓર્ડર કરવા બદલ આભાર! તમારો ઓર્ડર ${v.orderId} પૂર્ણ થયો છે.` },
      rejected: { title: "ઓર્ડર નકારાયો", body: (v) => `${v.restaurant} તમારો ઓર્ડર ${v.orderId} સ્વીકારી શક્યું નથી.${v.reason ? ` કારણ: ${v.reason}.` : ""} તમારી ₹${v.amount} ની ચુકવણી સંપૂર્ણ રિફંડ માટે પાત્ર છે.` },
      reminder: { title: "તમારા ઓર્ડરનો સમય નજીક છે", body: (v) => `યાદ અપાવીએ: ઓર્ડર ${v.orderId} માટે આજે ${v.time} વાગ્યે ${v.restaurant} પર તમારી રાહ જોવાય છે.` },
    },
  },
  kn: {
    status: { UPCOMING: "ಆರ್ಡರ್ ಮಾಡಲಾಗಿದೆ", ACKNOWLEDGED: "ಸ್ವೀಕರಿಸಲಾಗಿದೆ", PREPARING: "ತಯಾರಾಗುತ್ತಿದೆ", READY: "ಸಿದ್ಧ", COMPLETED: "ಪೂರ್ಣಗೊಂಡಿದೆ", CANCELLED: "ರದ್ದುಗೊಂಡಿದೆ", REJECTED: "ತಿರಸ್ಕರಿಸಲಾಗಿದೆ" },
    cancellationReason: { CHANGE_OF_PLANS: "ಯೋಜನೆ ಬದಲಾಗಿದೆ", BOOKED_BY_MISTAKE: "ತಪ್ಪಾಗಿ ಬುಕ್ ಆಗಿದೆ", FOUND_BETTER_OPTION: "ಉತ್ತಮ ಆಯ್ಕೆ ಸಿಕ್ಕಿತು", RESTAURANT_NOT_RESPONDING: "ರೆಸ್ಟೋರೆಂಟ್ ಪ್ರತಿಕ್ರಿಯಿಸುತ್ತಿಲ್ಲ", OTHER: "ಇತರೆ" },
    notifications: {
      placed: { title: "ಆರ್ಡರ್ ಮಾಡಲಾಗಿದೆ", body: (v) => `${v.restaurant} ನಲ್ಲಿ ನಿಮ್ಮ ಆರ್ಡರ್ ${v.orderId} ಇಂದು ${v.time} ಕ್ಕೆ ಆಗಮನಕ್ಕಾಗಿ ಮಾಡಲಾಗಿದೆ. ರೆಸ್ಟೋರೆಂಟ್ ಸ್ವೀಕರಿಸಿದ ನಂತರ ನಾವು ನಿಮಗೆ ತಿಳಿಸುತ್ತೇವೆ.` },
      modified: { title: "ಆರ್ಡರ್ ನವೀಕರಿಸಲಾಗಿದೆ", body: (v) => `ನಿಮ್ಮ ಆರ್ಡರ್ ${v.orderId} ಈಗ ${v.people} ಜನರಿಗೆ, ಇಂದು ${v.time} ಕ್ಕೆ ಆಗಮನ.` },
      cancelled: { title: "ಆರ್ಡರ್ ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ", body: (v) => `ನಿಮ್ಮ ಆರ್ಡರ್ ${v.orderId} ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ.` },
      cancelledByRestaurant: { title: "ಆರ್ಡರ್ ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ", body: (v) => `ನಿಮ್ಮ ಆರ್ಡರ್ ${v.orderId} ಅನ್ನು ರೆಸ್ಟೋರೆಂಟ್ ರದ್ದುಗೊಳಿಸಿದೆ. ನಿಮ್ಮ ₹${v.amount} ಪಾವತಿಯು ಪೂರ್ಣ ಮರುಪಾವತಿಗೆ ಅರ್ಹವಾಗಿದೆ.` },
      acknowledged: { title: "ಆರ್ಡರ್ ಸ್ವೀಕರಿಸಲಾಗಿದೆ", body: (v) => `${v.restaurant} ನಿಮ್ಮ ಆರ್ಡರ್ ${v.orderId} ಅನ್ನು ಸ್ವೀಕರಿಸಿದೆ. ${v.time} ಕ್ಕೆ ಭೇಟಿಯಾಗೋಣ!` },
      preparing: { title: "ನಿಮ್ಮ ಆಹಾರ ತಯಾರಾಗುತ್ತಿದೆ", body: (v) => `${v.restaurant} ನಿಮ್ಮ ಆರ್ಡರ್ ${v.orderId} ಅನ್ನು ತಯಾರಿಸಲು ಪ್ರಾರಂಭಿಸಿದೆ.` },
      ready: { title: "ನಿಮ್ಮ ಆಹಾರ ಸಿದ್ಧವಾಗಿದೆ", body: (v) => `${v.restaurant} ನಲ್ಲಿ ನಿಮ್ಮ ಆರ್ಡರ್ ${v.orderId} ಸಿದ್ಧವಾಗಿದೆ.` },
      completed: { title: "ಆರ್ಡರ್ ಪೂರ್ಣಗೊಂಡಿದೆ", body: (v) => `${v.restaurant} ನಿಂದ ಆರ್ಡರ್ ಮಾಡಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು! ನಿಮ್ಮ ಆರ್ಡರ್ ${v.orderId} ಪೂರ್ಣಗೊಂಡಿದೆ.` },
      rejected: { title: "ಆರ್ಡರ್ ತಿರಸ್ಕರಿಸಲಾಗಿದೆ", body: (v) => `${v.restaurant} ನಿಮ್ಮ ಆರ್ಡರ್ ${v.orderId} ಅನ್ನು ಸ್ವೀಕರಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.${v.reason ? ` ಕಾರಣ: ${v.reason}.` : ""} ನಿಮ್ಮ ₹${v.amount} ಪಾವತಿಯು ಪೂರ್ಣ ಮರುಪಾವತಿಗೆ ಅರ್ಹವಾಗಿದೆ.` },
      reminder: { title: "ನಿಮ್ಮ ಆರ್ಡರ್ ಸಮಯ ಹತ್ತಿರವಾಗಿದೆ", body: (v) => `ಜ್ಞಾಪನೆ: ಆರ್ಡರ್ ${v.orderId} ಗಾಗಿ ಇಂದು ${v.time} ಕ್ಕೆ ${v.restaurant} ನಲ್ಲಿ ನಿಮ್ಮನ್ನು ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ.` },
    },
  },
  bn: {
    status: { UPCOMING: "অর্ডার দেওয়া হয়েছে", ACKNOWLEDGED: "গৃহীত", PREPARING: "তৈরি হচ্ছে", READY: "তৈরি", COMPLETED: "সম্পূর্ণ", CANCELLED: "বাতিল", REJECTED: "প্রত্যাখ্যাত" },
    cancellationReason: { CHANGE_OF_PLANS: "পরিকল্পনা পরিবর্তন", BOOKED_BY_MISTAKE: "ভুল করে বুক হয়েছে", FOUND_BETTER_OPTION: "আরও ভালো বিকল্প পেয়েছি", RESTAURANT_NOT_RESPONDING: "রেস্তোরাঁ সাড়া দিচ্ছে না", OTHER: "অন্যান্য" },
    notifications: {
      placed: { title: "অর্ডার দেওয়া হয়েছে", body: (v) => `${v.restaurant}-এ আপনার অর্ডার ${v.orderId} আজ ${v.time}-এ পৌঁছানোর জন্য দেওয়া হয়েছে। রেস্তোরাঁ এটি গ্রহণ করলে আমরা আপনাকে জানাব।` },
      modified: { title: "অর্ডার আপডেট হয়েছে", body: (v) => `আপনার অর্ডার ${v.orderId} এখন ${v.people} জনের জন্য, আজ ${v.time}-এ পৌঁছাবেন।` },
      cancelled: { title: "অর্ডার বাতিল হয়েছে", body: (v) => `আপনার অর্ডার ${v.orderId} বাতিল করা হয়েছে।` },
      cancelledByRestaurant: { title: "অর্ডার বাতিল হয়েছে", body: (v) => `আপনার অর্ডার ${v.orderId} রেস্তোরাঁ বাতিল করেছে। আপনার ₹${v.amount} পেমেন্ট সম্পূর্ণ রিফান্ডের যোগ্য।` },
      acknowledged: { title: "অর্ডার গৃহীত হয়েছে", body: (v) => `${v.restaurant} আপনার অর্ডার ${v.orderId} গ্রহণ করেছে। ${v.time}-এ দেখা হবে!` },
      preparing: { title: "আপনার খাবার তৈরি হচ্ছে", body: (v) => `${v.restaurant} আপনার অর্ডার ${v.orderId} তৈরি করা শুরু করেছে।` },
      ready: { title: "আপনার খাবার তৈরি", body: (v) => `${v.restaurant}-এ আপনার অর্ডার ${v.orderId} তৈরি।` },
      completed: { title: "অর্ডার সম্পূর্ণ হয়েছে", body: (v) => `${v.restaurant} থেকে অর্ডার করার জন্য ধন্যবাদ! আপনার অর্ডার ${v.orderId} সম্পূর্ণ হয়েছে।` },
      rejected: { title: "অর্ডার প্রত্যাখ্যাত হয়েছে", body: (v) => `${v.restaurant} আপনার অর্ডার ${v.orderId} গ্রহণ করতে পারেনি।${v.reason ? ` কারণ: ${v.reason}।` : ""} আপনার ₹${v.amount} পেমেন্ট সম্পূর্ণ রিফান্ডের যোগ্য।` },
      reminder: { title: "আপনার অর্ডারের সময় হয়ে আসছে", body: (v) => `মনে করিয়ে দিচ্ছি: অর্ডার ${v.orderId}-এর জন্য আজ ${v.time}-এ ${v.restaurant}-এ আপনার আসার কথা।` },
    },
  },
  pa: {
    status: { UPCOMING: "ਆਰਡਰ ਦਿੱਤਾ ਗਿਆ", ACKNOWLEDGED: "ਸਵੀਕਾਰ ਕੀਤਾ", PREPARING: "ਬਣ ਰਿਹਾ ਹੈ", READY: "ਤਿਆਰ", COMPLETED: "ਪੂਰਾ ਹੋਇਆ", CANCELLED: "ਰੱਦ", REJECTED: "ਅਸਵੀਕਾਰ" },
    cancellationReason: { CHANGE_OF_PLANS: "ਯੋਜਨਾ ਵਿੱਚ ਬਦਲਾਅ", BOOKED_BY_MISTAKE: "ਗਲਤੀ ਨਾਲ ਬੁੱਕ ਹੋ ਗਿਆ", FOUND_BETTER_OPTION: "ਬਿਹਤਰ ਵਿਕਲਪ ਮਿਲ ਗਿਆ", RESTAURANT_NOT_RESPONDING: "ਰੈਸਟੋਰੈਂਟ ਜਵਾਬ ਨਹੀਂ ਦੇ ਰਿਹਾ", OTHER: "ਹੋਰ" },
    notifications: {
      placed: { title: "ਆਰਡਰ ਦਿੱਤਾ ਗਿਆ", body: (v) => `${v.restaurant} 'ਤੇ ਤੁਹਾਡਾ ਆਰਡਰ ${v.orderId} ਅੱਜ ${v.time} ਵਜੇ ਪਹੁੰਚਣ ਲਈ ਦਿੱਤਾ ਗਿਆ ਹੈ। ਰੈਸਟੋਰੈਂਟ ਦੇ ਸਵੀਕਾਰ ਕਰਦੇ ਹੀ ਅਸੀਂ ਤੁਹਾਨੂੰ ਦੱਸਾਂਗੇ।` },
      modified: { title: "ਆਰਡਰ ਅੱਪਡੇਟ ਕੀਤਾ ਗਿਆ", body: (v) => `ਤੁਹਾਡਾ ਆਰਡਰ ${v.orderId} ਹੁਣ ${v.people} ਲੋਕਾਂ ਲਈ ਹੈ, ਅੱਜ ${v.time} ਵਜੇ ਪਹੁੰਚਣਾ ਹੈ।` },
      cancelled: { title: "ਆਰਡਰ ਰੱਦ ਕੀਤਾ ਗਿਆ", body: (v) => `ਤੁਹਾਡਾ ਆਰਡਰ ${v.orderId} ਰੱਦ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ।` },
      cancelledByRestaurant: { title: "ਆਰਡਰ ਰੱਦ ਕੀਤਾ ਗਿਆ", body: (v) => `ਤੁਹਾਡਾ ਆਰਡਰ ${v.orderId} ਰੈਸਟੋਰੈਂਟ ਵੱਲੋਂ ਰੱਦ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ। ਤੁਹਾਡਾ ₹${v.amount} ਦਾ ਭੁਗਤਾਨ ਪੂਰੇ ਰਿਫੰਡ ਲਈ ਯੋਗ ਹੈ।` },
      acknowledged: { title: "ਆਰਡਰ ਸਵੀਕਾਰ ਕੀਤਾ ਗਿਆ", body: (v) => `${v.restaurant} ਨੇ ਤੁਹਾਡਾ ਆਰਡਰ ${v.orderId} ਸਵੀਕਾਰ ਕਰ ਲਿਆ ਹੈ। ${v.time} ਵਜੇ ਮਿਲਦੇ ਹਾਂ!` },
      preparing: { title: "ਤੁਹਾਡਾ ਖਾਣਾ ਬਣ ਰਿਹਾ ਹੈ", body: (v) => `${v.restaurant} ਨੇ ਤੁਹਾਡਾ ਆਰਡਰ ${v.orderId} ਬਣਾਉਣਾ ਸ਼ੁਰੂ ਕਰ ਦਿੱਤਾ ਹੈ।` },
      ready: { title: "ਤੁਹਾਡਾ ਖਾਣਾ ਤਿਆਰ ਹੈ", body: (v) => `${v.restaurant} 'ਤੇ ਤੁਹਾਡਾ ਆਰਡਰ ${v.orderId} ਤਿਆਰ ਹੈ।` },
      completed: { title: "ਆਰਡਰ ਪੂਰਾ ਹੋਇਆ", body: (v) => `${v.restaurant} ਤੋਂ ਆਰਡਰ ਕਰਨ ਲਈ ਧੰਨਵਾਦ! ਤੁਹਾਡਾ ਆਰਡਰ ${v.orderId} ਪੂਰਾ ਹੋ ਗਿਆ ਹੈ।` },
      rejected: { title: "ਆਰਡਰ ਅਸਵੀਕਾਰ ਕੀਤਾ ਗਿਆ", body: (v) => `${v.restaurant} ਤੁਹਾਡਾ ਆਰਡਰ ${v.orderId} ਸਵੀਕਾਰ ਨਹੀਂ ਕਰ ਸਕਿਆ।${v.reason ? ` ਕਾਰਨ: ${v.reason}।` : ""} ਤੁਹਾਡਾ ₹${v.amount} ਦਾ ਭੁਗਤਾਨ ਪੂਰੇ ਰਿਫੰਡ ਲਈ ਯੋਗ ਹੈ।` },
      reminder: { title: "ਤੁਹਾਡੇ ਆਰਡਰ ਦਾ ਸਮਾਂ ਨੇੜੇ ਹੈ", body: (v) => `ਯਾਦ ਦਿਵਾਉਣਾ: ਆਰਡਰ ${v.orderId} ਲਈ ਅੱਜ ${v.time} ਵਜੇ ${v.restaurant} 'ਤੇ ਤੁਹਾਡੀ ਉਡੀਕ ਹੈ।` },
    },
  },
  as: {
    status: { UPCOMING: "অৰ্ডাৰ দিয়া হৈছে", ACKNOWLEDGED: "গৃহীত", PREPARING: "প্ৰস্তুত হৈ আছে", READY: "সাজু", COMPLETED: "সম্পূৰ্ণ", CANCELLED: "বাতিল", REJECTED: "নাকচ" },
    cancellationReason: { CHANGE_OF_PLANS: "পৰিকল্পনা সলনি", BOOKED_BY_MISTAKE: "ভুলতে বুক কৰা হ'ল", FOUND_BETTER_OPTION: "ভাল বিকল্প পালোঁ", RESTAURANT_NOT_RESPONDING: "ৰেষ্টুৰেণ্টে সঁহাৰি দিয়া নাই", OTHER: "অন্য" },
    notifications: {
      placed: { title: "অৰ্ডাৰ দিয়া হ'ল", body: (v) => `${v.restaurant}ত আপোনাৰ অৰ্ডাৰ ${v.orderId} আজি ${v.time}ত উপস্থিত হোৱাৰ বাবে দিয়া হৈছে। ৰেষ্টুৰেণ্টে ইয়াক গ্ৰহণ কৰিলে আমি আপোনাক জনাম।` },
      modified: { title: "অৰ্ডাৰ আপডেট কৰা হ'ল", body: (v) => `আপোনাৰ অৰ্ডাৰ ${v.orderId} এতিয়া ${v.people} জনৰ বাবে, আজি ${v.time}ত উপস্থিত হ'ব।` },
      cancelled: { title: "অৰ্ডাৰ বাতিল কৰা হ'ল", body: (v) => `আপোনাৰ অৰ্ডাৰ ${v.orderId} বাতিল কৰা হৈছে।` },
      cancelledByRestaurant: { title: "অৰ্ডাৰ বাতিল কৰা হ'ল", body: (v) => `আপোনাৰ অৰ্ডাৰ ${v.orderId} ৰেষ্টুৰেণ্টে বাতিল কৰিছে। আপোনাৰ ₹${v.amount} পৰিশোধ সম্পূৰ্ণ ধন ঘূৰাই পোৱাৰ যোগ্য।` },
      acknowledged: { title: "অৰ্ডাৰ গ্ৰহণ কৰা হ'ল", body: (v) => `${v.restaurant}এ আপোনাৰ অৰ্ডাৰ ${v.orderId} গ্ৰহণ কৰিছে। ${v.time}ত লগ পাম!` },
      preparing: { title: "আপোনাৰ খাদ্য প্ৰস্তুত হৈ আছে", body: (v) => `${v.restaurant}এ আপোনাৰ অৰ্ডাৰ ${v.orderId} প্ৰস্তুত কৰিবলৈ আৰম্ভ কৰিছে।` },
      ready: { title: "আপোনাৰ খাদ্য সাজু", body: (v) => `${v.restaurant}ত আপোনাৰ অৰ্ডাৰ ${v.orderId} সাজু।` },
      completed: { title: "অৰ্ডাৰ সম্পূৰ্ণ হ'ল", body: (v) => `${v.restaurant}ৰ পৰা অৰ্ডাৰ কৰাৰ বাবে ধন্যবাদ! আপোনাৰ অৰ্ডাৰ ${v.orderId} সম্পূৰ্ণ হৈছে।` },
      rejected: { title: "অৰ্ডাৰ নাকচ কৰা হ'ল", body: (v) => `${v.restaurant}এ আপোনাৰ অৰ্ডাৰ ${v.orderId} গ্ৰহণ কৰিব নোৱাৰিলে।${v.reason ? ` কাৰণ: ${v.reason}।` : ""} আপোনাৰ ₹${v.amount} পৰিশোধ সম্পূৰ্ণ ধন ঘূৰাই পোৱাৰ যোগ্য।` },
      reminder: { title: "আপোনাৰ অৰ্ডাৰৰ সময় ওচৰ চাপিছে", body: (v) => `সোঁৱৰণী: অৰ্ডাৰ ${v.orderId}ৰ বাবে আজি ${v.time}ত ${v.restaurant}ত আপোনাক আশা কৰা হৈছে।` },
    },
  },
  mr: {
    status: { UPCOMING: "ऑर्डर दिली", ACKNOWLEDGED: "स्वीकारली", PREPARING: "तयार होत आहे", READY: "तयार", COMPLETED: "पूर्ण", CANCELLED: "रद्द", REJECTED: "नाकारली" },
    cancellationReason: { CHANGE_OF_PLANS: "योजनेत बदल", BOOKED_BY_MISTAKE: "चुकून बुक झाले", FOUND_BETTER_OPTION: "चांगला पर्याय मिळाला", RESTAURANT_NOT_RESPONDING: "रेस्टॉरंट प्रतिसाद देत नाही", OTHER: "इतर" },
    notifications: {
      placed: { title: "ऑर्डर दिली", body: (v) => `${v.restaurant} येथे तुमची ऑर्डर ${v.orderId} आज ${v.time} वाजता पोहोचण्यासाठी दिली आहे. रेस्टॉरंटने ती स्वीकारल्यावर आम्ही तुम्हाला कळवू.` },
      modified: { title: "ऑर्डर अपडेट झाली", body: (v) => `तुमची ऑर्डर ${v.orderId} आता ${v.people} लोकांसाठी आहे, आज ${v.time} वाजता पोहोचायचे आहे.` },
      cancelled: { title: "ऑर्डर रद्द झाली", body: (v) => `तुमची ऑर्डर ${v.orderId} रद्द करण्यात आली आहे.` },
      cancelledByRestaurant: { title: "ऑर्डर रद्द झाली", body: (v) => `तुमची ऑर्डर ${v.orderId} रेस्टॉरंटने रद्द केली आहे. तुमचे ₹${v.amount} चे पेमेंट पूर्ण परताव्यासाठी पात्र आहे.` },
      acknowledged: { title: "ऑर्डर स्वीकारली", body: (v) => `${v.restaurant} ने तुमची ऑर्डर ${v.orderId} स्वीकारली आहे. ${v.time} वाजता भेटू!` },
      preparing: { title: "तुमचे जेवण तयार होत आहे", body: (v) => `${v.restaurant} ने तुमची ऑर्डर ${v.orderId} तयार करायला सुरुवात केली आहे.` },
      ready: { title: "तुमचे जेवण तयार आहे", body: (v) => `${v.restaurant} येथे तुमची ऑर्डर ${v.orderId} तयार आहे.` },
      completed: { title: "ऑर्डर पूर्ण झाली", body: (v) => `${v.restaurant} मधून ऑर्डर केल्याबद्दल धन्यवाद! तुमची ऑर्डर ${v.orderId} पूर्ण झाली आहे.` },
      rejected: { title: "ऑर्डर नाकारली", body: (v) => `${v.restaurant} तुमची ऑर्डर ${v.orderId} स्वीकारू शकले नाही.${v.reason ? ` कारण: ${v.reason}.` : ""} तुमचे ₹${v.amount} चे पेमेंट पूर्ण परताव्यासाठी पात्र आहे.` },
      reminder: { title: "तुमच्या ऑर्डरची वेळ जवळ आली आहे", body: (v) => `आठवण: ऑर्डर ${v.orderId} साठी आज ${v.time} वाजता ${v.restaurant} येथे तुमची वाट पाहिली जात आहे.` },
    },
  },
};

export const statusLabel = (status: BookingStatus, lang: Language) => MESSAGES[lang].status[status];

export const cancellationReasonLabel = (reason: CancellationReason, lang: Language) => MESSAGES[lang].cancellationReason[reason];

export const notificationText = (event: NotificationEvent, lang: Language, vars: NotificationVars) => {
  const copy = MESSAGES[lang].notifications[event];
  return { title: copy.title, body: copy.body(vars) };
};
