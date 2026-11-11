import React, { useState } from "react";
import { User, UserRole } from "./types/hms";
import { INITIAL_USERS } from "./lib/mockData";
import { MobileFrame } from "./components/mobile/MobileFrame";
import { Navbar } from "./components/Navbar";
import { SudheerSidebar } from "./components/SudheerSidebar";
import { BottomTabBar } from "./components/mobile/BottomTabBar";

import { LoginPage } from "./components/auth/LoginPage";
import { DoctorHub } from "./components/doctor/DoctorHub";
import { PatientManagement } from "./components/clinical/PatientManagement";
import { LaboratoryPortal } from "./components/lab/LaboratoryPortal";
import { PharmacyHub } from "./components/pharmacy/PharmacyHub";
import { PatientPortal } from "./components/patient/PatientPortal";
import { AdminHub } from "./components/admin/AdminHub";

import { BarcodeScannerModal } from "./components/mobile/BarcodeScannerModal";
import { PrintDocumentModal } from "./components/print/PrintDocumentModal";
import { ClinicalAiAssistant } from "./components/ai/ClinicalAiAssistant";
import { NotificationCenterModal } from "./components/notifications/NotificationCenterModal";
import { PaymentGatewayModal } from "./components/payment/PaymentGatewayModal";
import { VitalsTrendChart } from "./components/clinical/VitalsTrendChart";
import { LanguageCode, getStoredLanguage, setStoredLanguage } from "./lib/i18n";
import { organizationService } from "./services/organizationService";
import { getStoredNotifications } from "./lib/storage";
import { X } from "lucide-react";

export default function App() {
  const [usersList] = useState<User[]>(INITIAL_USERS);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeUser, setActiveUser] = useState<User>(INITIAL_USERS[0]); // Default: Dr. Sarah Vance
  const [activeTab, setActiveTab] = useState<string>("doctor_opd");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Dynamic Database Hospital Logo State
  const [orgLogo, setOrgLogo] = useState<string | null>(organizationService.getCachedLogo());
  const [orgName, setOrgName] = useState<string>(organizationService.getCachedName());

  const fetchOrganizationBranding = async () => {
    const res = await organizationService.getOrganizationDetails();
    if (res.logoUrl) {
      setOrgLogo(res.logoUrl);
    }
    if (res.data?.legalName || res.data?.brandName) {
      setOrgName(res.data.legalName || res.data.brandName);
    }
  };

  React.useEffect(() => {
    fetchOrganizationBranding();
  }, []);

  // Internationalization Language State
  const [currentLang, setCurrentLang] = useState<LanguageCode>(getStoredLanguage());

  const handleLanguageChange = (lang: LanguageCode) => {
    setCurrentLang(lang);
    setStoredLanguage(lang);
  };

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [isAiOpen, setIsAiOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);

  // Handle user switching / login
  const handleSelectUser = (user: User) => {
    setActiveUser(user);
    setIsAuthenticated(true);
    fetchOrganizationBranding();
    // Set default active tab based on new role
    switch (user.role) {
      case "doctor":
        setActiveTab("doctor_opd");
        break;
      case "patient":
        setActiveTab("patient_home");
        break;
      case "clinical_nurse":
        setActiveTab("nurse_opd");
        break;
      case "lab_tech":
        setActiveTab("lab_orders");
        break;
      case "pharmacist":
        setActiveTab("pharmacy_billing");
        break;
      case "admin":
      default:
        setActiveTab("admin_overview");
        break;
    }
  };

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleSelectUser} orgLogo={orgLogo} orgName={orgName} />;
  }

  const handleScanSuccess = (type: "patient" | "lab" | "stock", code: string) => {
    console.log(`Scanned ${type}: ${code}`);
    if (type === "patient") {
      setActiveTab("patient_history");
    } else if (type === "lab") {
      setActiveTab("lab_orders");
    } else if (type === "stock") {
      setActiveTab("pharmacy_stock");
    }
  };

  return (
    <MobileFrame
      activeUser={activeUser}
      onSelectUser={handleSelectUser}
      usersList={usersList}
      onOpenScanner={() => setIsScannerOpen(true)}
      onOpenPrint={() => setIsPrintOpen(true)}
      onOpenAiAssistant={() => setIsAiOpen(true)}
    >
      <div className="flex-1 flex flex-col h-full bg-[#0c0d0f] text-slate-100 overflow-hidden relative">
        {/* Universal Top Bar with Language, Notifications & Payment */}
        <Navbar
          activeUser={activeUser}
          onOpenAiAssistant={() => setIsAiOpen(true)}
          onOpenScanner={() => setIsScannerOpen(true)}
          onOpenPrint={() => setIsPrintOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenPayment={() => setIsPaymentOpen(true)}
          unreadCount={getStoredNotifications().filter((n) => !n.isRead).length}
          currentLang={currentLang}
          onLanguageChange={handleLanguageChange}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          onLogout={() => setIsAuthenticated(false)}
          orgLogo={orgLogo}
          orgName={orgName}
        />

        {/* Workspace Layout: Overlay Drawer + Main Content */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Sudheer Hospital Navigation Slide-Over Drawer */}
          {isSidebarOpen && (
            <div className="absolute inset-0 z-40 flex">
              {/* Semi-transparent backdrop */}
              <div
                className="absolute inset-0 bg-black/75 backdrop-blur-xs transition-opacity cursor-pointer"
                onClick={() => setIsSidebarOpen(false)}
              />
              {/* Slide-over menu container */}
              <div className="relative z-50 w-72 max-w-[85%] h-full bg-[#111215] shadow-2xl border-r border-[#2a2c36] flex flex-col">
                <div className="absolute top-3.5 right-3.5 z-50">
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1.5 rounded-lg bg-[#1a1c22] hover:bg-[#252832] text-slate-400 hover:text-white border border-[#2e303a] transition-all"
                    title="Close navigation menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <SudheerSidebar
                  activeTab={activeTab}
                  onTabChange={(tabId) => {
                    setActiveTab(tabId);
                    setIsSidebarOpen(false); // Auto-close drawer on menu item selection!
                  }}
                  activeUser={activeUser}
                  onCloseMobileDrawer={() => setIsSidebarOpen(false)}
                  orgLogo={orgLogo}
                  orgName={orgName}
                />
              </div>
            </div>
          )}

          {/* Main Content Workspace - 100% Full Width */}
          <div className="flex-1 overflow-y-auto flex flex-col bg-[#111215] w-full min-w-0">
            {/* Telemetry Vitals Trend Chart Banner for Clinical Tabs */}
            {activeTab === "doctor_vitals" && (
              <div className="p-4 max-w-7xl mx-auto w-full space-y-4">
                <VitalsTrendChart patientName="Eleanor Vance" />
              </div>
            )}

            {/* Doctor Hub Views */}
            {(activeTab.startsWith("doctor_") || activeTab === "patient_history") && activeTab !== "doctor_vitals" && (
              <DoctorHub
                activeDoctor={activeUser}
                subTab={activeTab}
                onOpenAiAssistant={() => setIsAiOpen(true)}
                onOpenPrint={() => setIsPrintOpen(true)}
              />
            )}

            {/* Patient Portal Views */}
            {activeTab.startsWith("patient_") && activeTab !== "patient_history" && (
              <PatientPortal
                activeUser={activeUser}
                subTab={activeTab}
                onOpenPrint={() => setIsPrintOpen(true)}
                onOpenAiAssistant={() => setIsAiOpen(true)}
              />
            )}

            {/* Nurse / Clinical Admissions / Catering Views */}
            {(activeTab.startsWith("nurse_") || activeTab === "nurse_catering") && (
              <PatientManagement
                subTab={activeTab}
                onOpenPrint={() => setIsPrintOpen(true)}
              />
            )}

            {/* Laboratory Portal Views */}
            {activeTab.startsWith("lab_") && (
              <LaboratoryPortal
                subTab={activeTab}
                onOpenPrint={() => setIsPrintOpen(true)}
                onOpenScanner={() => setIsScannerOpen(true)}
              />
            )}

            {/* Pharmacy Hub Views */}
            {(activeTab.startsWith("pharmacy_") || activeTab === "pharmacy_stock") && (
              <PharmacyHub
                onOpenPrint={() => setIsPrintOpen(true)}
                onOpenScanner={() => setIsScannerOpen(true)}
              />
            )}

            {/* Admin Executive & Configuration Views */}
            {activeTab.startsWith("admin_") && (
              <AdminHub subTab={activeTab} />
            )}
          </div>
        </div>

        {/* Native Mobile Bottom Navigation Bar */}
        <BottomTabBar
          role={activeUser.role}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Global Floating Modals */}
        <BarcodeScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={handleScanSuccess}
        />

        <PrintDocumentModal
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          documentType="token"
        />

        <ClinicalAiAssistant
          isOpen={isAiOpen}
          onClose={() => setIsAiOpen(false)}
        />

        <NotificationCenterModal
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          onNavigateTab={(tabId) => {
            setActiveTab(tabId);
            setIsNotificationsOpen(false);
          }}
        />

        <PaymentGatewayModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          onOpenPrint={() => setIsPrintOpen(true)}
        />
      </div>
    </MobileFrame>
  );
}
