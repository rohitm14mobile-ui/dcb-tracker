import React, { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  LayoutDashboard,
  List,
  Plus,
  Trash2,
  Settings,
  TrendingUp,
  AlertCircle,
  Award,
  CheckCircle2,
  ChevronDown,
  Activity,
  Filter,
  Lock,
  BookOpen,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore";

// --- HDFC DCB Categories & Rules (Updated for June 2026 MITC) ---
const CATEGORIES = [
  {
    id: "regular",
    label: "Retail / General eligible spend",
    multiplier: 1,
    smartbuy: false,
    baseEligible: true,
  },
  {
    id: "weekend-dining",
    label: "Weekend dining",
    multiplier: 2,
    smartbuy: false,
    baseEligible: true,
  },
  {
    id: "grocery",
    label: "Groceries",
    multiplier: 1,
    smartbuy: false,
    baseEligible: true,
    rewardCapKey: "groceryMonthlyRewardCap",
  },
  {
    id: "smartbuy-igp",
    label: "SmartBuy IGP.com",
    multiplier: 10,
    smartbuy: true,
    baseEligible: true,
  },
  {
    id: "smartbuy-flights",
    label: "SmartBuy flights",
    multiplier: 5,
    smartbuy: true,
    baseEligible: true,
  },
  {
    id: "smartbuy-hotels",
    label: "SmartBuy hotels",
    multiplier: 10,
    smartbuy: true,
    baseEligible: true,
  },
  {
    id: "smartbuy-trains",
    label: "SmartBuy trains",
    multiplier: 3,
    smartbuy: true,
    baseEligible: true,
  },
  {
    id: "smartbuy-buses",
    label: "SmartBuy buses",
    multiplier: 5,
    smartbuy: true,
    baseEligible: true,
  },
  {
    id: "smartbuy-vouchers",
    label: "SmartBuy brand vouchers",
    multiplier: 3,
    smartbuy: true,
    baseEligible: true,
  },
  {
    id: "smartbuy-apple",
    label: "SmartBuy Apple Imagine/Tresor",
    multiplier: 3,
    smartbuy: true,
    baseEligible: true,
  },
  {
    id: "smartbuy-myntra",
    label: "SmartBuy Myntra",
    multiplier: 5,
    smartbuy: true,
    baseEligible: true,
  },
  {
    id: "smartbuy-jockey",
    label: "SmartBuy Jockey",
    multiplier: 10,
    smartbuy: true,
    baseEligible: true,
  },
  {
    id: "smartbuy-mmt-holidays",
    label: "SmartBuy MMT holiday packages",
    multiplier: 5,
    smartbuy: true,
    baseEligible: true,
  },
  {
    id: "smartbuy-pharmeasy",
    label: "SmartBuy Pharmeasy",
    multiplier: 10,
    smartbuy: true,
    baseEligible: true,
  },
  {
    id: "smartbuy-dutyfree",
    label: "SmartBuy Duty Free",
    multiplier: 5,
    smartbuy: true,
    baseEligible: true,
  },
  {
    id: "smartbuy-drivado",
    label: "SmartBuy Drivado",
    multiplier: 5,
    smartbuy: true,
    baseEligible: true,
  },
  {
    id: "insurance",
    label: "Insurance",
    multiplier: 1,
    smartbuy: false,
    baseEligible: true,
    rewardCapKey: "insuranceMonthlyRewardCap",
  },
  {
    id: "rent",
    label: "Rent payment",
    multiplier: 0,
    smartbuy: false,
    baseEligible: false,
    isRent: true,
  },
  {
    id: "fuel",
    label: "Fuel",
    multiplier: 0,
    smartbuy: false,
    baseEligible: false,
    isFuel: true,
  },
  {
    id: "utility",
    label: "Utility",
    multiplier: 1,
    smartbuy: false,
    baseEligible: true,
    rewardCapKey: "utilityMonthlyRewardCap",
    isUtility: true,
  },
  {
    id: "telecom",
    label: "Telecom",
    multiplier: 1,
    smartbuy: false,
    baseEligible: true,
    rewardCapKey: "telecomMonthlyRewardCap",
  },
  {
    id: "upi",
    label: "UPI card purchase",
    multiplier: 1,
    smartbuy: false,
    baseEligible: true,
    rewardCapKey: "upiMonthlyRewardCap",
  },
  {
    id: "education-third-party",
    label: "Education via third-party app",
    multiplier: 0,
    smartbuy: false,
    baseEligible: false,
    isThirdPartyEd: true,
  },
  {
    id: "government",
    label: "Government transaction",
    multiplier: 0,
    smartbuy: false,
    baseEligible: false,
  },
  {
    id: "wallet",
    label: "Wallet loading",
    multiplier: 0,
    smartbuy: false,
    baseEligible: false,
  },
  {
    id: "gaming",
    label: "Online skill gaming",
    multiplier: 0,
    smartbuy: false,
    baseEligible: false,
  },
  {
    id: "emi",
    label: "Converted to EMI / SmartEMI",
    multiplier: 0,
    smartbuy: false,
    baseEligible: false,
  },
  {
    id: "excluded",
    label: "Excluded / no reward",
    multiplier: 0,
    smartbuy: false,
    baseEligible: false,
  },
];

const CAPS = {
  SMARTBUY_BONUS_MONTHLY: 10000,
  groceryMonthlyRewardCap: 2000,
  utilityMonthlyRewardCap: 2000,
  telecomMonthlyRewardCap: 2000,
  insuranceMonthlyRewardCap: 5000,
  upiMonthlyRewardCap: 500,
  DINING_DAILY: 1000,
  QUARTERLY_MILESTONE: 400000,
  ANNUAL_MILESTONE: 800000,
};

const DEFAULT_CARDHOLDERS = [
  "Primary Card",
  "Add-on 1",
  "Add-on 2",
  "Add-on 3",
  "Add-on 4",
];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Helper Date Formatter (DD-Mmm-YYYY)
const formatDate = (dateString) => {
  const d = new Date(dateString);
  if (isNaN(d)) return dateString;
  const day = String(d.getDate()).padStart(2, "0");
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// --- Exact Database Keys you provided ---
const firebaseConfig = {
  apiKey: "AIzaSyCDX7vURjlAeUmK4wRgtzqqMGPWCOP3-Xg",
  authDomain: "dcb-tracker.firebaseapp.com",
  projectId: "dcb-tracker",
  storageBucket: "dcb-tracker.firebasestorage.app",
  messagingSenderId: "1075042994251",
  appId: "1:1075042994251:web:0b74b647832e925f41e5ce",
  measurementId: "G-ML5B3GQY87",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  // Authentication State
  const [user, setUser] = useState(null);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [transactions, setTransactions] = useState([]);
  const [cardholders, setCardholders] = useState(DEFAULT_CARDHOLDERS);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Custom Date Filters
  const currentDate = new Date();
  const [selMonth, setSelMonth] = useState(currentDate.getMonth() + 1); // 1-12
  const [selYear, setSelYear] = useState(currentDate.getFullYear());
  const [filterHolder, setFilterHolder] = useState("All");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editHolders, setEditHolders] = useState([...DEFAULT_CARDHOLDERS]);

  const [newTxn, setNewTxn] = useState({
    date: new Date().toISOString().substring(0, 10),
    amount: "",
    categoryId: CATEGORIES[0].id,
    cardHolder: "",
  });

  // Check saved login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      await signInWithEmailAndPassword(auth, emailInput, passwordInput);
    } catch (error) {
      setAuthError("Incorrect Email or Password.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    if (!user) return;

    // Fetch Transactions directly from your Firebase Database
    const qTxn = query(collection(db, "family_transactions"));
    const unsubTxn = onSnapshot(qTxn, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTransactions(data);
      setLoading(false);
    });

    // Fetch Settings (Cardholders) directly from your Firebase Database
    const unsubSet = onSnapshot(
      doc(db, "family_settings", "profile"),
      (docSnap) => {
        if (docSnap.exists() && docSnap.data().cardholders) {
          setCardholders(docSnap.data().cardholders);
          setEditHolders(docSnap.data().cardholders);
        } else {
          setLoading(false);
        }
      }
    );

    return () => {
      unsubTxn();
      unsubSet();
    };
  }, [user]);

  // Set default cardholder once loaded
  useEffect(() => {
    if (!newTxn.cardHolder && cardholders.length > 0) {
      setNewTxn((prev) => ({ ...prev, cardHolder: cardholders[0] }));
    }
  }, [cardholders]);

  const processedData = useMemo(() => {
    // Sort chronologically
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    const monthlyState = {};
    const processedTxns = [];

    sorted.forEach((txn) => {
      const monthKey = txn.date.substring(0, 7); // YYYY-MM
      const dateKey = txn.date;

      if (!monthlyState[monthKey]) {
        monthlyState[monthKey] = {
          groceryMonthlyRewardCap: 0,
          utilityMonthlyRewardCap: 0,
          telecomMonthlyRewardCap: 0,
          insuranceMonthlyRewardCap: 0,
          upiMonthlyRewardCap: 0,
          smartBuyBonusRP: 0,
          dailyDining: {},
          totalSpend: 0,
          totalEarnedRP: 0,
          totalFees: 0, // NEW: Tracking HDFC 1% Surcharges
          cardholderSpends: {},
        };
      }

      const mState = monthlyState[monthKey];
      const category =
        CATEGORIES.find((c) => c.id === txn.categoryId) || CATEGORIES[0];

      mState.totalSpend += Number(txn.amount);
      mState.cardholderSpends[txn.cardHolder] =
        (mState.cardholderSpends[txn.cardHolder] || 0) + Number(txn.amount);

      let earnedRP = 0;
      let note = "";
      let fee = 0;
      let feeNote = "";

      // --- HDFC 1% Surcharge Processing ---
      if (category.isRent) {
        fee = Math.min(Number(txn.amount) * 0.01, 3000);
        feeNote = `+ ₹${fee.toLocaleString("en-IN")} Bank Fee`;
      } else if (category.isThirdPartyEd) {
        fee = Math.min(Number(txn.amount) * 0.01, 3000);
        feeNote = `+ ₹${fee.toLocaleString("en-IN")} Bank Fee`;
      } else if (category.isUtility && Number(txn.amount) > 50000) {
        fee = Math.min(Number(txn.amount) * 0.01, 3000);
        feeNote = `+ ₹${fee.toLocaleString("en-IN")} Bank Fee`;
      } else if (category.isFuel && Number(txn.amount) > 15000) {
        fee = Math.min(Number(txn.amount) * 0.01, 3000);
        feeNote = `+ ₹${fee.toLocaleString("en-IN")} Bank Fee`;
      }
      mState.totalFees += fee;

      // --- Rewards Processing ---
      const baseRP = category.baseEligible
        ? Math.floor(txn.amount / 150) * 5
        : 0;

      if (!category.baseEligible) {
        earnedRP = 0;
        if (!feeNote) note = "No points for this category";
      } else if (category.smartbuy) {
        const bonusMult = category.multiplier - 1;
        const potentialBonus = Math.floor(txn.amount / 150) * (5 * bonusMult);
        const allowedBonus = Math.min(
          potentialBonus,
          CAPS.SMARTBUY_BONUS_MONTHLY - mState.smartBuyBonusRP
        );

        mState.smartBuyBonusRP += allowedBonus;
        earnedRP = baseRP + allowedBonus;
        if (allowedBonus < potentialBonus) note = "SmartBuy Cap Reached";
      } else if (category.id === "weekend-dining") {
        if (!mState.dailyDining[dateKey]) mState.dailyDining[dateKey] = 0;
        const diningBonus = Math.floor(txn.amount / 150) * 5; // Extra 1X
        const allowedBonus = Math.min(
          diningBonus,
          CAPS.DINING_DAILY - mState.dailyDining[dateKey]
        );

        mState.dailyDining[dateKey] += allowedBonus;
        earnedRP = baseRP + allowedBonus;
        if (allowedBonus < diningBonus) note = "Daily Dining Cap Reached";
      } else if (category.rewardCapKey) {
        const capKey = category.rewardCapKey;
        const limit = CAPS[capKey];
        const allowed = Math.min(baseRP, limit - mState[capKey]);

        mState[capKey] += allowed;
        earnedRP = allowed;
        if (allowed < baseRP) note = "Monthly Limit Reached";
      } else {
        earnedRP = baseRP; // Regular eligible
      }

      mState.totalEarnedRP += earnedRP;
      processedTxns.push({
        ...txn,
        earnedRP,
        note,
        fee,
        feeNote,
        categoryLabel: category.label,
      });
    });

    return { processedTxns: processedTxns.reverse(), monthlyState };
  }, [transactions]);

  const monthKey = `${selYear}-${String(selMonth).padStart(2, "0")}`;

  const quarterStats = useMemo(() => {
    const quarter = Math.ceil(selMonth / 3);
    const startMonth = (quarter - 1) * 3 + 1;
    const monthsInQuarter = [
      `${selYear}-${String(startMonth).padStart(2, "0")}`,
      `${selYear}-${String(startMonth + 1).padStart(2, "0")}`,
      `${selYear}-${String(startMonth + 2).padStart(2, "0")}`,
    ];

    let quarterSpend = 0;
    monthsInQuarter.forEach((m) => {
      if (processedData.monthlyState[m]) {
        if (filterHolder === "All") {
          quarterSpend += processedData.monthlyState[m].totalSpend;
        } else {
          quarterSpend +=
            processedData.monthlyState[m].cardholderSpends[filterHolder] || 0;
        }
      }
    });

    return {
      spend: quarterSpend,
      target: CAPS.QUARTERLY_MILESTONE,
      progress: Math.min((quarterSpend / CAPS.QUARTERLY_MILESTONE) * 100, 100),
      label: `Q${quarter} ${selYear}`,
    };
  }, [selMonth, selYear, filterHolder, processedData.monthlyState]);

  const annualStats = useMemo(() => {
    // Annual runs June 1st to May 31st (Because card was issued June 1st, 2026)
    let startYear = selYear;
    if (selMonth < 6) startYear -= 1; // If viewing Jan-May, annual cycle started last June

    let annualSpend = 0;
    let annualRP = 0;

    for (let m = 0; m < 12; m++) {
      let checkMonth = 6 + m; // Starts at June
      let checkYear = startYear;
      if (checkMonth > 12) {
        checkMonth -= 12;
        checkYear += 1;
      }
      const mKey = `${checkYear}-${String(checkMonth).padStart(2, "0")}`;
      if (processedData.monthlyState[mKey]) {
        if (filterHolder === "All") {
          annualSpend += processedData.monthlyState[mKey].totalSpend;
          annualRP += processedData.monthlyState[mKey].totalEarnedRP;
        } else {
          annualSpend +=
            processedData.monthlyState[mKey].cardholderSpends[filterHolder] ||
            0;
          // For RP, we keep family level display
          annualRP += processedData.monthlyState[mKey].totalEarnedRP;
        }
      }
    }

    return {
      spend: annualSpend,
      earnedRP: annualRP,
      target: CAPS.ANNUAL_MILESTONE,
      progress: Math.min((annualSpend / CAPS.ANNUAL_MILESTONE) * 100, 100),
      label: `Anniversary (Jun ${startYear} - May ${startYear + 1})`,
    };
  }, [selMonth, selYear, filterHolder, processedData.monthlyState]);

  const currentStats = processedData.monthlyState[monthKey] || {
    groceryMonthlyRewardCap: 0,
    utilityMonthlyRewardCap: 0,
    telecomMonthlyRewardCap: 0,
    insuranceMonthlyRewardCap: 0,
    upiMonthlyRewardCap: 0,
    smartBuyBonusRP: 0,
    totalSpend: 0,
    totalEarnedRP: 0,
    totalFees: 0,
    cardholderSpends: {},
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!newTxn.amount || isNaN(newTxn.amount) || newTxn.amount <= 0) return;
    const txnData = {
      ...newTxn,
      amount: Number(newTxn.amount),
      createdAt: new Date().toISOString(),
    };

    await addDoc(collection(db, "family_transactions"), txnData);

    setShowAddModal(false);
    setNewTxn({ ...newTxn, amount: "" });
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "family_transactions", id));
  };

  const handleSaveSettings = async () => {
    await setDoc(
      doc(db, "family_settings", "profile"),
      { cardholders: editHolders },
      { merge: true }
    );
    setShowSettingsModal(false);
  };

  // --- Auth Screen ---
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-900 font-sans p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
          <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">
            Private Family Tracker
          </h2>
          <p className="text-zinc-500 text-sm mb-6">
            Enter your email and password to access the dashboard.
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Email ID"
              className="w-full text-center text-lg font-medium border border-zinc-200 rounded-xl p-4 focus:ring-2 focus:ring-amber-500 outline-none"
              autoFocus
            />
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              className="w-full text-center text-lg font-medium border border-zinc-200 rounded-xl p-4 focus:ring-2 focus:ring-amber-500 outline-none"
            />
            {authError && (
              <p className="text-red-500 text-sm font-medium">{authError}</p>
            )}
            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-xl shadow-sm transition-colors"
            >
              Secure Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Filter Logic for Views
  const filteredTxns = processedData.processedTxns.filter(
    (t) =>
      t.date.startsWith(monthKey) &&
      (filterHolder === "All" || t.cardHolder === filterHolder)
  );
  const displayTotalSpend =
    filterHolder === "All"
      ? currentStats.totalSpend
      : currentStats.cardholderSpends[filterHolder] || 0;

  // --- Policy Trigger Logic ---
  // Calculates how many months have passed since June 2026
  const monthsSinceUpdate =
    (new Date().getFullYear() - 2026) * 12 + (new Date().getMonth() - 5);
  const isPolicyUpdateDue = monthsSinceUpdate >= 6;

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <div className="animate-pulse text-zinc-500 font-medium">
          Loading Diners Club Data...
        </div>
      </div>
    );

  return (
    <div className="flex h-screen bg-zinc-100 font-sans text-zinc-800">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 text-zinc-100 flex flex-col transition-all">
        <div className="p-6">
          <div className="flex items-center gap-3 text-amber-500 mb-2">
            <CreditCard size={28} />
            <h1 className="text-xl font-bold tracking-wider uppercase text-zinc-100">
              DCB Metal
            </h1>
          </div>
          <p className="text-xs text-zinc-400 font-medium tracking-wide">
            REWARDS TRACKER
          </p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === "dashboard"
                ? "bg-amber-500/10 text-amber-500"
                : "hover:bg-zinc-800 text-zinc-400"
            }`}
          >
            <LayoutDashboard size={20} />{" "}
            <span className="font-medium">Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === "logs"
                ? "bg-amber-500/10 text-amber-500"
                : "hover:bg-zinc-800 text-zinc-400"
            }`}
          >
            <List size={20} /> <span className="font-medium">Transactions</span>
          </button>
        </nav>

        <div className="p-4 space-y-2">
          <button
            onClick={() => setShowPolicyModal(true)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-zinc-400 hover:bg-zinc-800 transition-colors text-sm"
          >
            <div className="flex items-center gap-3">
              <BookOpen size={18} />{" "}
              <span className="font-medium">HDFC Policies</span>
            </div>
            {isPolicyUpdateDue && (
              <ShieldAlert size={16} className="text-amber-500" />
            )}
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-zinc-800 transition-colors"
          >
            <Settings size={20} /> <span className="font-medium">Settings</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:bg-zinc-800 transition-colors text-xs text-left mt-4 border border-zinc-800"
          >
            <Lock size={14} /> Lock Tracker (Logout)
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-6xl mx-auto">
          {/* Header & Controls */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900">
                Family Overview
              </h2>
              <p className="text-zinc-500 text-sm mt-1">
                Track family spends and maximize returns.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Cardholder Filter */}
              <div className="bg-white border border-zinc-200 px-3 py-2 rounded-xl flex items-center gap-2 shadow-sm relative cursor-pointer">
                <Filter size={16} className="text-amber-500" />
                <select
                  value={filterHolder}
                  onChange={(e) => setFilterHolder(e.target.value)}
                  className="bg-transparent border-none focus:outline-none text-zinc-800 text-sm font-medium pr-4 appearance-none outline-none cursor-pointer"
                >
                  <option value="All">All Family Spends</option>
                  {cardholders.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-2 top-2.5 text-zinc-400 pointer-events-none"
                  size={14}
                />
              </div>

              {/* Month/Year Fix Dropdowns */}
              <div className="bg-white border border-zinc-200 px-3 py-2 rounded-xl flex items-center gap-2 shadow-sm">
                <select
                  value={selMonth}
                  onChange={(e) => setSelMonth(Number(e.target.value))}
                  className="bg-transparent text-sm font-bold text-zinc-800 outline-none appearance-none pr-2 cursor-pointer"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <span className="text-zinc-300">/</span>
                <select
                  value={selYear}
                  onChange={(e) => setSelYear(Number(e.target.value))}
                  className="bg-transparent text-sm font-bold text-zinc-800 outline-none appearance-none cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm text-sm"
              >
                <Plus size={16} /> Add Spend
              </button>
            </div>
          </header>

          {/* Surcharges Warning Banner */}
          {currentStats.totalFees > 0 && filterHolder === "All" && (
            <div className="mb-6 bg-red-50 text-red-800 p-4 rounded-xl text-sm flex items-start gap-3 border border-red-200">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-600" />
              <div>
                <strong>HDFC Processing Fees Detected:</strong> The family has
                incurred approx{" "}
                <strong>
                  ₹{currentStats.totalFees.toLocaleString("en-IN")}
                </strong>{" "}
                in bank fees this month based on the 1% rule for Rent, Utility
                (>50k), Fuel (>15k), or Third-party Education apps.
              </div>
            </div>
          )}

          {/* Dashboard View */}
          {activeTab === "dashboard" ? (
            <div className="space-y-6">
              {/* Cardholder Spends Breakdown (Moved to Top) */}
              <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-zinc-900">
                    Total Spend ({MONTHS[selMonth - 1]} {selYear})
                  </h3>
                  <div className="text-right">
                    <div className="text-2xl font-black text-zinc-800">
                      ₹ {displayTotalSpend.toLocaleString("en-IN")}
                    </div>
                    {/* Monthly RP Added Here */}
                    <div className="text-sm font-bold text-green-600">
                      +
                      {filterHolder === "All"
                        ? currentStats.totalEarnedRP.toLocaleString("en-IN")
                        : "Family Calculation"}{" "}
                      RP Earned This Month
                    </div>
                  </div>
                </div>

                {filterHolder === "All" && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-2 border-t border-zinc-100">
                    {cardholders.map((holder) => (
                      <div
                        key={holder}
                        className="bg-zinc-50 p-4 rounded-xl border border-zinc-100"
                      >
                        <div className="text-xs text-zinc-500 font-medium mb-1">
                          {holder}
                        </div>
                        <div className="text-lg font-bold text-zinc-800">
                          ₹{" "}
                          {(
                            currentStats.cardholderSpends[holder] || 0
                          ).toLocaleString("en-IN")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Row: Spends & Milestones */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Spends - Annual Focus */}
                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                  <div className="text-zinc-500 text-sm font-medium mb-2 flex justify-between items-center">
                    <span>{annualStats.label}</span>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-md ${
                        annualStats.progress >= 100
                          ? "text-green-700 bg-green-100"
                          : "text-emerald-700 bg-emerald-50"
                      }`}
                    >
                      Fee Waiver
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-zinc-900 mb-3">
                    ₹ {annualStats.spend.toLocaleString("en-IN")}
                    <span className="text-sm font-normal text-zinc-400 ml-1">
                      / 8L
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-2.5 relative">
                    <div
                      className={`${
                        annualStats.progress >= 100
                          ? "bg-green-500"
                          : "bg-amber-500"
                      } h-2.5 rounded-full transition-all`}
                      style={{ width: `${annualStats.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Quarterly Milestone */}
                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <TrendingUp size={64} />
                  </div>
                  <div className="text-zinc-500 text-sm font-medium mb-2 flex justify-between items-center relative z-10">
                    <span>{quarterStats.label} Milestone</span>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-md ${
                        quarterStats.progress >= 100
                          ? "text-green-700 bg-green-100"
                          : "text-amber-700 bg-amber-50"
                      }`}
                    >
                      10K RP Bonus
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-zinc-900 relative z-10 mb-3">
                    ₹ {quarterStats.spend.toLocaleString("en-IN")}
                    <span className="text-sm font-normal text-zinc-400 ml-1">
                      / 4L
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-2.5 relative z-10">
                    <div
                      className={`${
                        quarterStats.progress >= 100
                          ? "bg-green-500"
                          : "bg-amber-500"
                      } h-2.5 rounded-full transition-all`}
                      style={{ width: `${quarterStats.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* ANNUAL Points Earned */}
                <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-6 rounded-2xl shadow-sm text-white flex flex-col justify-center relative">
                  <div className="font-medium mb-1 text-sm flex items-center gap-2 opacity-90">
                    <Award size={16} /> Annual RP Earned
                  </div>
                  <div className="text-3xl font-bold text-amber-500">
                    {filterHolder === "All"
                      ? annualStats.earnedRP.toLocaleString("en-IN")
                      : "Family View Only"}
                    <span className="text-lg opacity-80 font-medium ml-1 text-white">
                      RP
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-2 font-medium">
                    Cycle: Jun 2026 - May 2027
                  </div>
                </div>
              </div>

              {/* Family Monthly Capping Status */}
              <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
                  <CheckCircle2 className="text-green-500" size={20} /> Family
                  Monthly Capping Status
                  <span className="text-xs font-normal text-zinc-500 ml-2">
                    (Limits reset 1st of every calendar month)
                  </span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-8">
                  {/* SmartBuy */}
                  <div>
                    <div className="flex justify-between text-sm mb-2 font-medium">
                      <span className="text-zinc-700">
                        SmartBuy Accelerated Bonus
                      </span>
                      <span
                        className={
                          currentStats.smartBuyBonusRP >=
                          CAPS.SMARTBUY_BONUS_MONTHLY
                            ? "text-red-500"
                            : "text-zinc-500"
                        }
                      >
                        {currentStats.smartBuyBonusRP.toLocaleString("en-IN")} /
                        10,000
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          currentStats.smartBuyBonusRP >=
                          CAPS.SMARTBUY_BONUS_MONTHLY
                            ? "bg-red-500"
                            : "bg-blue-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            (currentStats.smartBuyBonusRP /
                              CAPS.SMARTBUY_BONUS_MONTHLY) *
                              100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Grocery */}
                  <div>
                    <div className="flex justify-between text-sm mb-2 font-medium">
                      <span className="text-zinc-700">Grocery Points</span>
                      <span
                        className={
                          currentStats.groceryMonthlyRewardCap >=
                          CAPS.groceryMonthlyRewardCap
                            ? "text-red-500"
                            : "text-zinc-500"
                        }
                      >
                        {currentStats.groceryMonthlyRewardCap.toLocaleString(
                          "en-IN"
                        )}{" "}
                        / 2,000
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          currentStats.groceryMonthlyRewardCap >=
                          CAPS.groceryMonthlyRewardCap
                            ? "bg-red-500"
                            : "bg-green-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            (currentStats.groceryMonthlyRewardCap /
                              CAPS.groceryMonthlyRewardCap) *
                              100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Telecom */}
                  <div>
                    <div className="flex justify-between text-sm mb-2 font-medium">
                      <span className="text-zinc-700">Telecom Points</span>
                      <span
                        className={
                          currentStats.telecomMonthlyRewardCap >=
                          CAPS.telecomMonthlyRewardCap
                            ? "text-red-500"
                            : "text-zinc-500"
                        }
                      >
                        {currentStats.telecomMonthlyRewardCap.toLocaleString(
                          "en-IN"
                        )}{" "}
                        / 2,000
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          currentStats.telecomMonthlyRewardCap >=
                          CAPS.telecomMonthlyRewardCap
                            ? "bg-red-500"
                            : "bg-indigo-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            (currentStats.telecomMonthlyRewardCap /
                              CAPS.telecomMonthlyRewardCap) *
                              100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Utility */}
                  <div>
                    <div className="flex justify-between text-sm mb-2 font-medium">
                      <span className="text-zinc-700">Utility Points</span>
                      <span
                        className={
                          currentStats.utilityMonthlyRewardCap >=
                          CAPS.utilityMonthlyRewardCap
                            ? "text-red-500"
                            : "text-zinc-500"
                        }
                      >
                        {currentStats.utilityMonthlyRewardCap.toLocaleString(
                          "en-IN"
                        )}{" "}
                        / 2,000
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          currentStats.utilityMonthlyRewardCap >=
                          CAPS.utilityMonthlyRewardCap
                            ? "bg-red-500"
                            : "bg-purple-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            (currentStats.utilityMonthlyRewardCap /
                              CAPS.utilityMonthlyRewardCap) *
                              100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Insurance */}
                  <div>
                    <div className="flex justify-between text-sm mb-2 font-medium">
                      <span className="text-zinc-700">Insurance Points</span>
                      <span
                        className={
                          currentStats.insuranceMonthlyRewardCap >=
                          CAPS.insuranceMonthlyRewardCap
                            ? "text-red-500"
                            : "text-zinc-500"
                        }
                      >
                        {currentStats.insuranceMonthlyRewardCap.toLocaleString(
                          "en-IN"
                        )}{" "}
                        / 5,000
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          currentStats.insuranceMonthlyRewardCap >=
                          CAPS.insuranceMonthlyRewardCap
                            ? "bg-red-500"
                            : "bg-pink-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            (currentStats.insuranceMonthlyRewardCap /
                              CAPS.insuranceMonthlyRewardCap) *
                              100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* UPI */}
                  <div>
                    <div className="flex justify-between text-sm mb-2 font-medium">
                      <span className="text-zinc-700">UPI Points</span>
                      <span
                        className={
                          currentStats.upiMonthlyRewardCap >=
                          CAPS.upiMonthlyRewardCap
                            ? "text-red-500"
                            : "text-zinc-500"
                        }
                      >
                        {currentStats.upiMonthlyRewardCap.toLocaleString(
                          "en-IN"
                        )}{" "}
                        / 500
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          currentStats.upiMonthlyRewardCap >=
                          CAPS.upiMonthlyRewardCap
                            ? "bg-red-500"
                            : "bg-teal-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            (currentStats.upiMonthlyRewardCap /
                              CAPS.upiMonthlyRewardCap) *
                              100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500">
                      <th className="p-4 font-medium">Date</th>
                      <th className="p-4 font-medium">Cardholder</th>
                      <th className="p-4 font-medium">Category / Note</th>
                      <th className="p-4 font-medium text-right">Amount (₹)</th>
                      <th className="p-4 font-medium text-right">Points</th>
                      <th className="p-4 font-medium text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredTxns.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="p-8 text-center text-zinc-500"
                        >
                          No transactions found for this period.
                        </td>
                      </tr>
                    ) : (
                      filteredTxns.map((txn) => (
                        <tr
                          key={txn.id}
                          className="hover:bg-zinc-50/50 transition-colors"
                        >
                          <td className="p-4 text-sm text-zinc-800">
                            {formatDate(txn.date)}
                          </td>
                          <td className="p-4 text-sm">
                            <span className="bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-md font-medium text-xs">
                              {txn.cardHolder}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-zinc-800">
                            {txn.categoryLabel}
                            {txn.feeNote && (
                              <span className="block text-[10px] text-red-500 mt-0.5 font-bold uppercase tracking-wider">
                                {txn.feeNote}
                              </span>
                            )}
                            {txn.note && (
                              <span className="block text-[10px] text-amber-500 mt-0.5 font-bold uppercase tracking-wider">
                                {txn.note}
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-sm font-medium text-zinc-900 text-right">
                            {txn.amount.toLocaleString("en-IN")}
                          </td>
                          <td className="p-4 text-sm font-bold text-green-600 text-right">
                            +{txn.earnedRP}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleDelete(txn.id)}
                              className="text-zinc-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-zinc-900">Log Spend</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={newTxn.date}
                  onChange={(e) =>
                    setNewTxn({ ...newTxn, date: e.target.value })
                  }
                  className="w-full border border-zinc-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Cardholder
                </label>
                <div className="relative">
                  <select
                    value={newTxn.cardHolder}
                    onChange={(e) =>
                      setNewTxn({ ...newTxn, cardHolder: e.target.value })
                    }
                    className="w-full border border-zinc-200 rounded-xl p-3 appearance-none focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                  >
                    {cardholders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-3.5 text-zinc-400 pointer-events-none"
                    size={16}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 5000"
                  value={newTxn.amount}
                  onChange={(e) =>
                    setNewTxn({ ...newTxn, amount: e.target.value })
                  }
                  className="w-full border border-zinc-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Category
                </label>
                <div className="relative">
                  <select
                    value={newTxn.categoryId}
                    onChange={(e) =>
                      setNewTxn({ ...newTxn, categoryId: e.target.value })
                    }
                    className="w-full border border-zinc-200 rounded-xl p-3 appearance-none focus:ring-2 focus:ring-amber-500 outline-none bg-white text-sm"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-3.5 text-zinc-400 pointer-events-none"
                    size={16}
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 border border-zinc-200 text-zinc-700 font-medium rounded-xl hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-zinc-900">
                Manage Cardholders
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-500 mb-4">
                Rename the Add-on cards so you can track your family's
                individual spends easily.
              </p>
              {editHolders.map((holder, index) => (
                <div key={index}>
                  <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">
                    {index === 0 ? "Primary Card" : `Add-on ${index}`}
                  </label>
                  <input
                    type="text"
                    value={holder}
                    onChange={(e) => {
                      const newHolders = [...editHolders];
                      newHolders[index] = e.target.value;
                      setEditHolders(newHolders);
                    }}
                    className="w-full border border-zinc-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                  />
                </div>
              ))}
              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 px-4 py-3 border border-zinc-200 text-zinc-700 font-medium rounded-xl hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="flex-1 px-4 py-3 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 shadow-sm"
                >
                  Save Names
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Policy & Rules Hub Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <BookOpen size={20} className="text-amber-500" /> Official HDFC
                Policies
              </h3>
              <button
                onClick={() => setShowPolicyModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              {isPolicyUpdateDue ? (
                <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm flex items-start gap-3 border border-amber-200">
                  <ShieldAlert
                    size={20}
                    className="shrink-0 mt-0.5 text-amber-600"
                  />
                  <div>
                    <strong>Policy Verification Due!</strong> It has been over 6
                    months since this app's rules were locked (June 2026).
                    Please open the links below to verify if HDFC has changed
                    any multipliers or caps. If they have, reach out to Gemini
                    to update the app logic!
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 text-green-800 p-4 rounded-xl text-sm flex items-start gap-3 border border-green-200">
                  <CheckCircle2
                    size={20}
                    className="shrink-0 mt-0.5 text-green-600"
                  />
                  <div>
                    <strong>Rules are up to date.</strong> This tracker is
                    locked to the HDFC rules published in June 2026. An alert
                    will appear here automatically after 6 months to re-verify
                    the links below.
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-2">
                  Source Documents
                </h4>

                <a
                  href="https://www.hdfc.bank.in/content/dam/hdfcbankpws/in/en/personal-banking/discover-products/cards/credit-cards/personal-mitc/mitc-in-english.pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 hover:border-amber-500 hover:bg-amber-50 transition-colors group"
                >
                  <div>
                    <div className="text-sm font-bold text-zinc-800 group-hover:text-amber-700">
                      HDFC Bank MITC
                    </div>
                    <div className="text-xs text-zinc-500">
                      Baseline: Updated 27 May 2026
                    </div>
                  </div>
                  <ExternalLink
                    size={16}
                    className="text-zinc-400 group-hover:text-amber-600"
                  />
                </a>

                <a
                  href="https://www.hdfc.bank.in/content/dam/hdfcbankpws/in/en/personal-banking/discover-products/cards/credit-cards/diners-club-black-metal-edition-credit-card/diners-club-metal-tandc.pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 hover:border-amber-500 hover:bg-amber-50 transition-colors group"
                >
                  <div>
                    <div className="text-sm font-bold text-zinc-800 group-hover:text-amber-700">
                      Diners Black Metal T&C
                    </div>
                    <div className="text-xs text-zinc-500">
                      Baseline: 1 June 2026
                    </div>
                  </div>
                  <ExternalLink
                    size={16}
                    className="text-zinc-400 group-hover:text-amber-600"
                  />
                </a>

                <a
                  href="https://www.hdfc.bank.in/credit-cards/diners-club-black-metal-edition-credit-card"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 hover:border-amber-500 hover:bg-amber-50 transition-colors group"
                >
                  <div>
                    <div className="text-sm font-bold text-zinc-800 group-hover:text-amber-700">
                      Product Page
                    </div>
                    <div className="text-xs text-zinc-500">
                      Official Features Overview
                    </div>
                  </div>
                  <ExternalLink
                    size={16}
                    className="text-zinc-400 group-hover:text-amber-600"
                  />
                </a>

                <a
                  href="https://offers.smartbuy.hdfc.bank.in/offer_details/smartbuy/15282"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 hover:border-amber-500 hover:bg-amber-50 transition-colors group"
                >
                  <div>
                    <div className="text-sm font-bold text-zinc-800 group-hover:text-amber-700">
                      SmartBuy Core Benefit Offer
                    </div>
                    <div className="text-xs text-zinc-500">
                      10X/5X/3X Multiplier Validations
                    </div>
                  </div>
                  <ExternalLink
                    size={16}
                    className="text-zinc-400 group-hover:text-amber-600"
                  />
                </a>

                <a
                  href="https://offers.reward360.in/v1/savings_calculator"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 hover:border-amber-500 hover:bg-amber-50 transition-colors group"
                >
                  <div>
                    <div className="text-sm font-bold text-zinc-800 group-hover:text-amber-700">
                      Reward360 Savings Calculator
                    </div>
                    <div className="text-xs text-zinc-500">
                      To double-check complex points logic
                    </div>
                  </div>
                  <ExternalLink
                    size={16}
                    className="text-zinc-400 group-hover:text-amber-600"
                  />
                </a>

                <a
                  href="https://v.hdfc.bank.in/htdocs/common/sms-communication.html"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 hover:border-amber-500 hover:bg-amber-50 transition-colors group"
                >
                  <div>
                    <div className="text-sm font-bold text-zinc-800 group-hover:text-amber-700">
                      HDFC SMS Communication Charges
                    </div>
                    <div className="text-xs text-zinc-500">
                      Validates the 1% fee on Rent, Utilities & Education
                    </div>
                  </div>
                  <ExternalLink
                    size={16}
                    className="text-zinc-400 group-hover:text-amber-600"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
