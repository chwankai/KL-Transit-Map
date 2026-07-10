import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Share, Heart, Bookmark, Info } from "lucide-react";
import { Footer } from "../components/layout/Footer";
import { useSettings } from "../context/SettingsContext";

export const GuideView: React.FC = () => {
  const navigate = useNavigate();
  const { language, t } = useSettings();

  return (
    <div className={language === "zh" ? "zh-body flex flex-col h-full w-full bg-background text-text-primary overflow-y-auto animate-fade-in select-none" : "flex flex-col h-full w-full bg-background text-text-primary overflow-y-auto animate-fade-in select-none"}>
      <div className="max-w-3xl mx-auto w-full px-5 py-6 space-y-6 flex-1">
        
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl border border-border bg-card text-text-secondary hover:text-text-primary transition-all active:scale-90 shadow-md flex-shrink-0"
            title={t("backToMap") || "Back"}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              {t("helpSupport") || "Help & Support"}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              {t("guideTitle") || "How-to Guide & Tips"}
            </h1>
          </div>
        </div>

        {/* Section Cards */}
        <div className="space-y-6">
          
          {/* Guide 1: Add to Home Screen (Safari) */}
          <div className="glass-panel rounded-2xl p-5 border border-border bg-card shadow-xl space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2 border-b border-border/60 pb-2">
              <Share className="h-4 w-4 text-blue-500" />
              {t("guideSafariTitle") || "iPhone Safari Add to Home Screen"}
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              {t("guideSafariDesc") || "For quick access like a native application, iPhone users can pin the website directly to their iOS Home Screen using Safari."}
            </p>
            <div className="space-y-3 pt-1">
              {[
                { step: 1, text: t("guideSafariStep1") || "Open the Safari browser on your iPhone and visit this website." },
                { step: 2, text: t("guideSafariStep2") || "Tap the Share button at the bottom of Safari navigation bar." },
                { step: 3, text: t("guideSafariStep3") || "Scroll down the Share options list and tap on 'Add to Home Screen'." },
                { step: 4, text: t("guideSafariStep4") || "Make sure 'Open as Web App' is selected and tap 'Add' in the top-right corner." }
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-blue-600/10 text-blue-500 text-[10px] font-bold">
                    {item.step}
                  </span>
                  <span className="text-xs text-text-primary leading-tight mt-0.5">{item.text}</span>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/25 p-3 rounded-xl">
              <Info className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-500 leading-normal">
                {t("guideSafariNote") || "Once added, opening the app from your Home Screen loads the app in fullscreen mode, providing a standalone web app experience!"}
              </span>
            </div>
          </div>

          {/* Guide 1.5: Page Introductions */}
          <div className="glass-panel rounded-2xl p-5 border border-border bg-card shadow-xl space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2 border-b border-border/60 pb-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              {t("guidePagesTitle") || "Page Introductions"}
            </h2>
            <div className="space-y-4 pt-1">
              {/* Map Page */}
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {t("guideMapTitle") || "Map Page"}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed pl-3">
                  {t("guideMapDesc")}
                </p>
              </div>
              
              {/* Lines Page */}
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  {t("guideLineTitle") || "Lines Page"}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed pl-3">
                  {t("guideLineDesc")}
                </p>
              </div>

              {/* Plan Page */}
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  {t("guidePlanTitle") || "Planner Page"}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed pl-3">
                  {t("guidePlanDesc")}
                </p>
              </div>
            </div>
          </div>

          {/* Guide 2: Favorite Stations */}
          <div className="glass-panel rounded-2xl p-5 border border-border bg-card shadow-xl space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2 border-b border-border/60 pb-2">
              <Heart className="h-4 w-4 text-red-500" />
              {t("guideFavTitle") || "Favorite Stations"}
            </h2>
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-text-primary">{t("whatIsIt") || "What is it?"}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {t("guideFavWhatDesc") || "Favorite Stations are shortcuts to your most frequently used platforms. Saving a station makes it appear first in the suggestions dropdown lists when searching for routes."}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-text-primary">{t("howToSave") || "How to save?"}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {t("guideFavSaveDesc") || "Navigate to the station details page you want to save. You can do so by searching in the explorer list, clicking on a station marker on the map, or searching a route. Inside the header of the details card, click the Heart icon next to the station name. It turns red, indicating it is favorited!"}
              </p>
            </div>
          </div>

          {/* Guide 3: Saved Journeys */}
          <div className="glass-panel rounded-2xl p-5 border border-border bg-card shadow-xl space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2 border-b border-border/60 pb-2">
              <Bookmark className="h-4 w-4 text-amber-500" />
              {t("guideRoutesTitle") || "Saved Journeys"}
            </h2>
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-text-primary">{t("whatIsIt") || "What is it?"}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {t("guideRoutesWhatDesc") || "Saved Journeys store pairs of origin and destination stations. Clicking on a saved journey in the planner view immediately paste your origin and destination stations to the planner without needing to type them again."}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-text-primary">{t("howToSave") || "How to save?"}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {t("guideRoutesSaveDesc") || "Open the Plan page, select your Origin and Destination stations, and click Calculate Route. Once the itinerary displays, look for the bookmark save button at the bottom of the results to save the journey. The route will be listed under the Saved Journeys section."}
              </p>
            </div>
          </div>

          {/* Guide 4: Real-time Information Notice */}
          <div className="glass-panel rounded-2xl p-5 border border-border bg-card shadow-xl space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2 border-b border-border/60 pb-2">
              <Info className="h-4 w-4 text-blue-500" />
              {t("guideNoticeTitle") || "Real-time Information Notice"}
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              {t("guideNoticeDesc")}
            </p>
          </div>

          {/* Guide 5: Disclaimer */}
          <div className="glass-panel rounded-2xl p-5 border border-border bg-card shadow-xl space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2 border-b border-border/60 pb-2">
              <Bookmark className="h-4 w-4 text-emerald-500" />
              {t("guideDisclaimerTitle") || "Disclaimer"}
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              {language === "zh" ? (
                <>
                  本站资讯使用<a href="https://developer.data.gov.my/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">马来西亚官方 API </a>所提供的数据。由于数据更新频率、网络传输、系统维护及第三方数据来源限制，显示的距离、预计时间、车辆资讯等内容可能存在误差或延迟。
                </>
              ) : language === "ms" ? (
                <>
                  Maklumat yang disediakan di laman web ini menggunakan data yang diperoleh daripada  <a href="https://developer.data.gov.my/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">API rasmi Kerajaan Malaysia</a>. Disebabkan oleh faktor seperti kekerapan kemas kini data, penghantaran rangkaian, penyelenggaraan sistem, serta batasan sumber data pihak ketiga, maklumat yang dipaparkan seperti jarak, anggaran masa perjalanan, maklumat kenderaan dan lain-lain mungkin mengandungi ketidaktepatan atau kelewatan.
                </>
              ) : (
                <>
                  The information provided on this website is based on data supplied by the <a href="https://developer.data.gov.my/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">official Malaysian API</a>. Due to factors such as data update frequency, network transmission, system maintenance, and limitations of third-party data sources, the displayed distance, estimated travel time, vehicle information, and other related details may contain inaccuracies or delays.
                </>
              )}
            </p>
            <p className="text-xs text-text-secondary leading-relaxed">
              {t("guideDisclaimerDesc2")}
            </p>
            <p className="text-xs text-text-secondary leading-relaxed">
              {language === "zh" ? (
                <>
                  如果您在使用过程中遇到任何问题或有任何建议，欢迎<a href="mailto:chwankai09132@gmail.com" className="text-blue-500 hover:underline">反馈给我们</a>，我们将尽快处理并持续进行改进。
                </>
              ) : language === "ms" ? (
                <>
                  Sekiranya anda menghadapi sebarang masalah atau mempunyai sebarang cadangan semasa menggunakan perkhidmatan ini, sila <a href="mailto:chwankai09132@gmail.com" className="text-blue-500 hover:underline">hubungi kami</a>. Kami akan meneliti maklum balas anda, mengambil tindakan yang sewajarnya dan terus menambah baik perkhidmatan ini.
                </>
              ) : (
                <>
                  If you encounter any issues or have any suggestions while using this service, please <a href="mailto:chwankai09132@gmail.com" className="text-blue-500 hover:underline">contact us</a>. We will review your feedback, take appropriate action, and continue improving our service.
                </>
              )}
            </p>
          </div>

        </div>

      </div>

      <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-4 pb-6 flex-shrink-0">
        <Footer />
      </div>
    </div>
  );
};
