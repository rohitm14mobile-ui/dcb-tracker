import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Filter,
  Lock,
  BookOpen,
  ExternalLink,
  ShieldAlert,
  Edit,
  Gift,
  PlusCircle,
  MinusCircle,
  Upload,
  FileText,
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
  updateDoc,
} from "firebase/firestore";

// --- HDFC DCB Categories & Rules (Updated for June 2026 MITC) ---
const CATEGORIES = [
  { id: "regular", label: "Retail / General eligible spend", multiplier: 1, smartbuy: false, baseEligible: true },
  { id: "weekend-dining", label: "Weekend dining", multiplier: 2, smartbuy: false, baseEligible: true },
  { id: "grocery", label: "Groceries", multiplier: 1, smartbuy: false, baseEligible: true, rewardCapKey: "groceryMonthlyRewardCap" },
  { id: "smartbuy-igp", label: "SmartBuy IGP.com", multiplier: 10, smartbuy: true, baseEligible: true },
  { id: "smartbuy-flights", label: "SmartBuy flights", multiplier: 5, smartbuy: true, baseEligible: true },
  { id: "smartbuy-hotels", label: "SmartBuy hotels", multiplier: 10, smartbuy: true, baseEligible: true },
  { id: "smartbuy-trains", label: "SmartBuy trains", multiplier: 3, smartbuy: true, baseEligible: true },
  { id: "smartbuy-buses", label: "SmartBuy buses", multiplier: 5, smartbuy: true, baseEligible: true },
  { id: "smartbuy-vouchers", label: "SmartBuy brand vouchers", multiplier: 3, smartbuy: true, baseEligible: true },
  { id: "smartbuy-apple", label: "SmartBuy Apple Imagine/Tresor", multiplier: 3, smartbuy: true, baseEligible: true },
  { id: "smartbuy-myntra", label: "SmartBuy Myntra", multiplier: 5, smartbuy: true, baseEligible: true },
  { id: "smartbuy-jockey", label: "SmartBuy Jockey", multiplier: 10, smartbuy: true, baseEligible: true },
  { id: "smartbuy-mmt-holidays", label: "SmartBuy MMT holiday packages", multiplier: 5, smartbuy: true, baseEligible: true },
  { id: "smartbuy-pharmeasy", label: "SmartBuy Pharmeasy", multiplier: 10, smartbuy: true, baseEligible: true },
  { id: "smartbuy-dutyfree", label: "SmartBuy Duty Free", multiplier: 5, smartbuy: true, baseEligible: true },
  { id: "smartbuy-drivado", label: "SmartBuy Drivado", multiplier: 5, smartbuy: true, baseEligible: true },
  { id: "insurance", label: "Insurance", multiplier: 1, smartbuy: false, baseEligible: true, rewardCapKey: "insuranceMonthlyRewardCap" },
  { id: "rent", label: "Rent payment", multiplier: 0, smartbuy: false, baseEligible: false, isRent: true },
  { id: "fuel", label: "Fuel", multiplier: 0, smartbuy: false, baseEligible: false, isFuel: true },
  { id: "utility", label: "Utility", multiplier: 1, smartbuy: false, baseEligible: true, rewardCapKey: "utilityMonthlyRewardCap", isUtility: true },
  { id: "telecom", label: "Telecom", multiplier: 1, smartbuy: false, baseEligible: true, rewardCapKey: "telecomMonthlyRewardCap" },
  { id: "upi", label: "UPI card purchase", multiplier: 1, smartbuy: false, baseEligible: true },
  { id: "education-third-party", label: "Education via third-party app", multiplier: 0, smartbuy: false, baseEligible: false, isThirdPartyEd: true },
  { id: "government", label: "Government transaction", multiplier: 0, smartbuy: false, baseEligible: false },
  { id: "wallet", label: "Wallet loading", multiplier: 0, smartbuy: false, baseEligible: false },
  { id: "gaming", label: "Online skill gaming", multiplier: 0, smartbuy: false, baseEligible: false },
  { id: "emi", label: "Converted to EMI / SmartEMI", multiplier: 0, smartbuy: false, baseEligible: false },
  { id: "excluded", label: "Excluded / no reward", multiplier: 0, smartbuy: false, baseEligible: false },
];

const CAPS = {
  SMARTBUY_BONUS_MONTHLY: 10000,
  groceryMonthlyRewardCap: 2000,
  utilityMonthlyRewardCap: 2000,
  telecomMonthlyRewardCap: 2000,
  insuranceMonthlyRewardCap: 5000,
  DINING_DAILY: 1000,
  QUARTERLY_MILESTONE: 400000,
  ANNUAL_MILESTONE: 800000,
};

const DEFAULT_CARDHOLDERS = ["Primary Card", "Add-on 1", "Add-on 2", "Add-on 3", "Add-on 4"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatDate = (dateString) => {
  const d = new Date(dateString);
  if (isNaN(d)) return dateString;
  const day = String(d.getDate()).padStart(2, "0");
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

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
  const [user, setUser] = useState(null);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [transactions, setTransactions] = useState([]);
  const [rewardsLog, setRewardsLog] = useState([]);
  const [cardholders, setCardholders] = useState(DEFAULT_CARDHOLDERS);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  const currentDate = new Date();
  const [selMonth, setSelMonth] = useState(currentDate.getMonth() + 1);
  const [selYear, setSelYear] = useState(currentDate.getFullYear());
  const [filterHolder, setFilterHolder] = useState("All");
  
  // NEW VIEW TOGGLE STATE
  const [viewMode, setViewMode] = useState("calendar"); // "calendar" or "statement"

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [stagedTxns, setStagedTxns] = useState([]);
  const fileInputRef = useRef(null);

  const [editHolders, setEditHolders] = useState([...DEFAULT_CARDHOLDERS]);

  const [isEditing, setIsEditing] = useState(false);
  const [editTxnId, setEditTxnId] = useState(null);
  const [refundInput, setRefundInput] = useState("");

  const [newTxn, setNewTxn] = useState({
    date: new Date().toISOString().substring(0, 10),
    amount: "",
    categoryId: CATEGORIES[0].id,
    cardHolder: "",
    remarks: "",
  });

  const [newReward, setNewReward] = useState({
    date: new Date().toISOString().substring(0, 10),
    type: "adjustment",
    points: "",
    cardHolder: "",
    remarks: "",
  });

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

  const handleLogout = async () => await signOut(auth);

  useEffect(() => {
    if (!user) return;

    const unsubTxn = onSnapshot(query(collection(db, "family_transactions")), (snapshot) => {
      setTransactions(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const unsubRewards = onSnapshot(query(collection(db, "family_rewards")), (snapshot) => {
      setRewardsLog(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSet = onSnapshot(doc(db, "family_settings", "profile"), (docSnap) => {
      if (docSnap.exists() && docSnap.data().cardholders) {
        setCardholders(docSnap.data().cardholders);
        setEditHolders(docSnap.data().cardholders);
      }
    });

    return () => {
      unsubTxn();
      unsubRewards();
      unsubSet();
    };
  }, [user]);

  // CORE CALCULATION ENGINE (Strictly follows Calendar Month logic for accurate HDFC Caps)
  const processedData = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    const monthlyState = {};
    const processedTxns = [];
    const lifetimeEarnedRP = {};

    sorted.forEach((txn) => {
      const monthKey = txn.date.substring(0, 7);
      const dateKey = txn.date;

      if (!monthlyState[monthKey]) {
        monthlyState[monthKey] = {
          groceryMonthlyRewardCap: 0, utilityMonthlyRewardCap: 0, telecomMonthlyRewardCap: 0,
          insuranceMonthlyRewardCap: 0, smartBuyBonusRP: 0, dailyDining: {},
          totalSpend: 0, totalEarnedRP: 0, totalFees: 0, 
          feeBreakdown: { rent: 0, utility: 0, fuel: 0, education: 0 },
          cardholderSpends: {},
        };
      }

      const mState = monthlyState[monthKey];
      const category = CATEGORIES.find((c) => c.id === txn.categoryId) || CATEGORIES[0];

      mState.totalSpend += Number(txn.amount);
      mState.cardholderSpends[txn.cardHolder] = (mState.cardholderSpends[txn.cardHolder] || 0) + Number(txn.amount);

      let earnedRP = 0, note = "", fee = 0, feeNote = "";

      if (category.isRent) {
        fee = Math.min(Number(txn.amount) * 0.01, 3000); 
        feeNote = `+ ₹${fee.toLocaleString("en-IN", {maximumFractionDigits: 2})} Bank Fee`;
        mState.feeBreakdown.rent += fee;
      } else if (category.isThirdPartyEd) {
        fee = Math.min(Number(txn.amount) * 0.01, 3000); 
        feeNote = `+ ₹${fee.toLocaleString("en-IN", {maximumFractionDigits: 2})} Bank Fee`;
        mState.feeBreakdown.education += fee;
      } else if (category.isUtility && Number(txn.amount) > 50000) {
        fee = Math.min(Number(txn.amount) * 0.01, 3000); 
        feeNote = `+ ₹${fee.toLocaleString("en-IN", {maximumFractionDigits: 2})} Bank Fee`;
        mState.feeBreakdown.utility += fee;
      } else if (category.isFuel && Number(txn.amount) > 15000) {
        fee = Math.min(Number(txn.amount) * 0.01, 3000); 
        feeNote = `+ ₹${fee.toLocaleString("en-IN", {maximumFractionDigits: 2})} Bank Fee`;
        mState.feeBreakdown.fuel += fee;
      }
      mState.totalFees += fee;

      const rawBaseRP = category.baseEligible ? Math.floor(txn.amount / 150) * 5 : 0;
      let finalBaseRP = 0;
      let finalBonusRP = 0;

      if (!category.baseEligible) {
        earnedRP = 0; if (!feeNote) note = "No points for this category";
      } else if (category.smartbuy) {
        const potentialBonus = Math.floor(txn.amount / 150) * (5 * (category.multiplier - 1));
        const allowedBonus = Math.min(potentialBonus, CAPS.SMARTBUY_BONUS_MONTHLY - mState.smartBuyBonusRP);
        mState.smartBuyBonusRP += allowedBonus;
        finalBaseRP = rawBaseRP;
        finalBonusRP = allowedBonus;
        earnedRP = finalBaseRP + finalBonusRP;
        if (allowedBonus < potentialBonus) note = "SmartBuy Cap Reached";
      } else if (category.id === "weekend-dining") {
        if (!mState.dailyDining[dateKey]) mState.dailyDining[dateKey] = 0;
        const diningBonus = Math.floor(txn.amount / 150) * 5;
        const allowedBonus = Math.min(diningBonus, CAPS.DINING_DAILY - mState.dailyDining[dateKey]);
        mState.dailyDining[dateKey] += allowedBonus;
        finalBaseRP = rawBaseRP;
        finalBonusRP = allowedBonus;
        earnedRP = finalBaseRP + finalBonusRP;
        if (allowedBonus < diningBonus) note = "Daily Dining Cap Reached";
      } else if (category.rewardCapKey) {
        const capKey = category.rewardCapKey;
        const limit = CAPS[capKey];
        const allowed = Math.min(rawBaseRP, limit - mState[capKey]);
        mState[capKey] += allowed;
        finalBaseRP = allowed;
        earnedRP = finalBaseRP;
        if (allowed < rawBaseRP) note = "Monthly Limit Reached";
      } else {
        finalBaseRP = rawBaseRP;
        earnedRP = finalBaseRP;
      }

      mState.totalEarnedRP += earnedRP;
      lifetimeEarnedRP[txn.cardHolder] = (lifetimeEarnedRP[txn.cardHolder] || 0) + earnedRP;

      processedTxns.push({ 
        ...txn, 
        earnedRP, 
        baseRP: finalBaseRP, 
        bonusRP: finalBonusRP, 
        note, 
        fee, 
        feeNote, 
        categoryLabel: category.label 
      });
    });

    return { processedTxns: processedTxns.reverse(), monthlyState, lifetimeEarnedRP };
  }, [transactions]);

  // DATE FILTRATION ENGINE (Handles the Toggle between Statement & Calendar views)
  const filteredTxns = useMemo(() => {
    return processedData.processedTxns.filter((t) => {
      // 1. Holder Filter
      if (filterHolder !== "All" && t.cardHolder !== filterHolder) return false;
      
      // 2. Date Filter
      if (viewMode === "calendar") {
        return t.date.startsWith(`${selYear}-${String(selMonth).padStart(2, "0")}`);
      } else {
        // Statement View: 16th of Prev Month -> 15th of Selected Month
        let prevMonth = selMonth - 1;
        let prevYear = selYear;
        if (prevMonth === 0) { prevMonth = 12; prevYear--; }
        const startDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-16`;
        const endDate = `${selYear}-${String(selMonth).padStart(2, "0")}-15`;
        return t.date >= startDate && t.date <= endDate;
      }
    });
  }, [processedData.processedTxns, filterHolder, selMonth, selYear, viewMode]);

  // Dynamic Dashboard Stats based strictly on the current View Toggle
  const viewStats = useMemo(() => {
    let spend = 0, points = 0, fees = 0;
    let cardholderSpends = {};
    let feeBreakdown = { rent: 0, utility: 0, fuel: 0, education: 0 };
    
    filteredTxns.forEach(t => {
      spend += t.amount;
      points += t.earnedRP;
      fees += t.fee || 0;
      cardholderSpends[t.cardHolder] = (cardholderSpends[t.cardHolder] || 0) + t.amount;
      
      const cat = CATEGORIES.find(c => c.id === t.categoryId) || CATEGORIES[0];
      if (cat.isRent) feeBreakdown.rent += t.fee;
      if (cat.isThirdPartyEd) feeBreakdown.education += t.fee;
      if (cat.isUtility && t.amount > 50000) feeBreakdown.utility += t.fee;
      if (cat.isFuel && t.amount > 15000) feeBreakdown.fuel += t.fee;
    });
    
    return { spend, points, fees, cardholderSpends, feeBreakdown };
  }, [filteredTxns]);

  const rewardsBalance = useMemo(() => {
    const balances = {};
    cardholders.forEach(h => balances[h] = { earned: processedData.lifetimeEarnedRP[h] || 0, adjustments: 0, redemptions: 0 });

    rewardsLog.forEach(log => {
      if (!balances[log.cardHolder]) balances[log.cardHolder] = { earned: 0, adjustments: 0, redemptions: 0 };
      if (log.type === 'adjustment') balances[log.cardHolder].adjustments += Number(log.points);
      if (log.type === 'redemption') balances[log.cardHolder].redemptions += Number(log.points);
    });

    Object.keys(balances).forEach(h => {
      balances[h].available = balances[h].earned + balances[h].adjustments - balances[h].redemptions;
    });

    return balances;
  }, [processedData.lifetimeEarnedRP, rewardsLog, cardholders]);

  const quarterStats = useMemo(() => {
    const quarter = Math.ceil(selMonth / 3);
    const startMonth = (quarter - 1) * 3 + 1;
    let quarterSpend = 0;
    [`${selYear}-${String(startMonth).padStart(2, "0")}`, `${selYear}-${String(startMonth + 1).padStart(2, "0")}`, `${selYear}-${String(startMonth + 2).padStart(2, "0")}`].forEach((m) => {
      if (processedData.monthlyState[m]) {
        quarterSpend += filterHolder === "All" ? processedData.monthlyState[m].totalSpend : (processedData.monthlyState[m].cardholderSpends[filterHolder] || 0);
      }
    });
    return { spend: quarterSpend, target: CAPS.QUARTERLY_MILESTONE, progress: Math.min((quarterSpend / CAPS.QUARTERLY_MILESTONE) * 100, 100), label: `Q${quarter} ${selYear}` };
  }, [selMonth, selYear, filterHolder, processedData.monthlyState]);

  const annualStats = useMemo(() => {
    let startYear = selYear;
    if (selMonth < 6) startYear -= 1;
    let annualSpend = 0, annualRP = 0;
    for (let m = 0; m < 12; m++) {
      let checkMonth = 6 + m, checkYear = startYear;
      if (checkMonth > 12) { checkMonth -= 12; checkYear += 1; }
      const mKey = `${checkYear}-${String(checkMonth).padStart(2, "0")}`;
      if (processedData.monthlyState[mKey]) {
        if (filterHolder === "All") {
          annualSpend += processedData.monthlyState[mKey].totalSpend;
          annualRP += processedData.monthlyState[mKey].totalEarnedRP;
        } else {
          annualSpend += processedData.monthlyState[mKey].cardholderSpends[filterHolder] || 0;
          annualRP += processedData.monthlyState[mKey].totalEarnedRP;
        }
      }
    }
    return { spend: annualSpend, earnedRP: annualRP, target: CAPS.ANNUAL_MILESTONE, progress: Math.min((annualSpend / CAPS.ANNUAL_MILESTONE) * 100, 100), label: `Anniversary (Jun ${startYear} - May ${startYear + 1})` };
  }, [selMonth, selYear, filterHolder, processedData.monthlyState]);

  // We explicitly fetch the CALENDAR month limits here to show the correct status bars.
  const calendarCappingStats = processedData.monthlyState[`${selYear}-${String(selMonth).padStart(2, "0")}`] || {
    groceryMonthlyRewardCap: 0, utilityMonthlyRewardCap: 0, telecomMonthlyRewardCap: 0,
    insuranceMonthlyRewardCap: 0, smartBuyBonusRP: 0
  };

  const openAddModal = () => {
    setIsEditing(false);
    setEditTxnId(null);
    setNewTxn({
      date: new Date().toISOString().substring(0, 10),
      amount: "",
      categoryId: CATEGORIES[0].id,
      cardHolder: cardholders.length > 0 ? cardholders[0] : "",
      remarks: "",
    });
    setRefundInput("");
    setShowAddModal(true);
  };

  const openEditModal = (txn) => {
    setIsEditing(true);
    setEditTxnId(txn.id);
    setNewTxn({
      date: txn.date,
      amount: txn.amount,
      categoryId: txn.categoryId,
      cardHolder: txn.cardHolder,
      remarks: txn.remarks || "",
    });
    setRefundInput("");
    setShowAddModal(true);
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!newTxn.amount || isNaN(newTxn.amount) || newTxn.amount <= 0) return;

    let safeCardHolder = newTxn.cardHolder;
    if (!safeCardHolder || !cardholders.includes(safeCardHolder)) {
      safeCardHolder = cardholders[0];
    }

    const txnData = {
      ...newTxn,
      cardHolder: safeCardHolder,
      amount: Number(newTxn.amount),
      createdAt: new Date().toISOString(),
    };

    if (isEditing && editTxnId) {
      await updateDoc(doc(db, "family_transactions", editTxnId), txnData);
    } else {
      await addDoc(collection(db, "family_transactions"), txnData);
    }

    setShowAddModal(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      await deleteDoc(doc(db, "family_transactions", id));
    }
  };

  // --- CSV PARSING LOGIC (With Tilde-Pipe Support & Auto Predictor) ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      
      const isPipeDelimited = text.includes('~|~');
      
      const rows = text.split('\n').map(row => {
          if (isPipeDelimited) {
              return row.split('~|~').map(cell => cell.trim());
          } else {
              const cells = [];
              let currentCell = '';
              for(let i=0; i<row.length; i++) {
                  if(row[i] === ',') {
                     cells.push(currentCell.trim());
                     currentCell = '';
                  } else if (row[i] !== '\r') {
                     currentCell += row[i];
                  }
              }
              cells.push(currentCell.trim());
              return cells;
          }
      });

      const extracted = [];
      let transactionIndex = 0;
      
      rows.forEach((row) => {
          if (!row || !Array.isArray(row) || row.length < 3) return;
          
          const dateCellIndex = row.findIndex(cell => cell && cell.match(/^\d{2}\/\d{2}\/\d{4}/));
          if (dateCellIndex === -1) return; 
          
          const isCr = row.some(cell => cell && cell.toUpperCase() === 'CR');
          if (isCr) return;
          
          const rawDateStr = row[dateCellIndex];
          const dateMatch = rawDateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
          if (!dateMatch) return;
          const formattedDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
          
          let amount = 0;
          for (let i = row.length - 1; i >= 0; i--) {
              const cell = row[i];
              if (cell && typeof cell === 'string') {
                  const clean = cell.replace(/,/g, '').trim();
                  if (/^\d+(\.\d+)?$/.test(clean)) { 
                      amount = parseFloat(clean); 
                      break; 
                  }
              }
          }
          if (amount <= 0) return;
          
          let desc = "";
          for (let i = dateCellIndex + 1; i < row.length; i++) {
              const cell = row[i];
              if (cell && cell.trim().length > 3 && !/^\d+(\.\d+)?$/.test(cell.replace(/,/g, ''))) {
                  desc = cell.trim();
                  break;
              }
          }
          
          let matchedHolder = cardholders.length > 0 ? cardholders[0] : "Primary Card";
          row.forEach(cell => {
             if (cell && typeof cell === 'string') {
                 cardholders.forEach(h => {
                     if (cell.toUpperCase().includes(h.toUpperCase())) matchedHolder = h;
                 });
             }
          });

          // --- AUTO-PREDICT CATEGORY LOGIC ---
          let predictedCategory = CATEGORIES[0].id; // Default Retail
          const descUpper = desc.toUpperCase();
          if (descUpper.includes("SMARTBUY") || descUpper.includes("SB EMT")) {
              if (descUpper.includes("MYNTRA")) predictedCategory = "smartbuy-myntra";
              else if (descUpper.includes("FLIGHT")) predictedCategory = "smartbuy-flights";
              else if (descUpper.includes("HOTEL")) predictedCategory = "smartbuy-hotels";
              else if (descUpper.includes("TRAIN")) predictedCategory = "smartbuy-trains";
              else if (descUpper.includes("GYFTR") || descUpper.includes("VOUCHER")) predictedCategory = "smartbuy-vouchers";
              else predictedCategory = "smartbuy-vouchers";
          } else if (descUpper.includes("DMART") || descUpper.includes("STAR BAZAAR") || descUpper.includes("RELIANCE FRESH") || descUpper.includes("GROCERY") || descUpper.includes("BLINKIT") || descUpper.includes("ZEPTO") || descUpper.includes("SWIGGY INSTAMART")) {
              predictedCategory = "grocery";
          } else if (descUpper.includes("NETFLIX") || descUpper.includes("AIRTEL") || descUpper.includes("JIO ") || descUpper.includes("RECHARGE") || descUpper.includes("BILLDESK")) {
              predictedCategory = "utility";
          } else if (descUpper.includes("INSURANCE") || descUpper.includes("LIC ")) {
              predictedCategory = "insurance";
          }
          // ------------------------------------
          
          const isDuplicate = transactions.some(t => 
            t.date === formattedDate && 
            t.amount === amount && 
            t.cardHolder === matchedHolder
          );
          
          extracted.push({
              id: 'staged_' + transactionIndex++,
              date: formattedDate,
              amount: amount,
              remarks: desc,
              categoryId: predictedCategory,
              cardHolder: matchedHolder,
              selected: !isDuplicate, 
              isDuplicate: isDuplicate
          });
      });
      setStagedTxns(extracted);
      setShowUploadModal(true);
    };
    reader.readAsText(file);
    e.target.value = ""; 
  };

  const updateStagedTxn = (id, field, value) => {
    setStagedTxns(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleImportStaged = async () => {
    const toImport = stagedTxns.filter(t => t.selected);
    for (const txn of toImport) {
      const { selected, isDuplicate, id, ...cleanTxn } = txn;
      cleanTxn.createdAt = new Date().toISOString();
      await addDoc(collection(db, "family_transactions"), cleanTxn);
    }
    setShowUploadModal(false);
    setStagedTxns([]);
    setActiveTab("logs");
  };

  const handleAddReward = async (e) => {
    e.preventDefault();
    if (!newReward.points || isNaN(newReward.points) || newReward.points <= 0) return;
    const rewardData = { ...newReward, points: Number(newReward.points), createdAt: new Date().toISOString() };
    await addDoc(collection(db, "family_rewards"), rewardData);
    setShowRewardModal(false);
    setNewReward({ ...newReward, points: "", remarks: "" });
  };

  const handleDeleteReward = async (id) => {
    if (window.confirm("Delete this points record?")) {
      await deleteDoc(doc(db, "family_rewards", id));
    }
  };

  const handleSaveSettings = async () => {
    const changedNames = [];
    cardholders.forEach((oldName, i) => {
      if (oldName !== editHolders[i]) changedNames.push({ old: oldName, new: editHolders[i] });
    });

    await setDoc(doc(db, "family_settings", "profile"), { cardholders: editHolders }, { merge: true });

    for (const change of changedNames) {
      const matchingTxns = transactions.filter((t) => t.cardHolder === change.old);
      for (const t of matchingTxns) {
        await updateDoc(doc(db, "family_transactions", t.id), { cardHolder: change.new });
      }
      const matchingRewards = rewardsLog.filter((r) => r.cardHolder === change.old);
      for (const r of matchingRewards) {
        await updateDoc(doc(db, "family_rewards", r.id), { cardHolder: change.new });
      }
    }
    setShowSettingsModal(false);
  };

  if (!user) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-zinc-900 font-sans p-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #a1a1aa 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center relative z-10 flex flex-col">
          <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">HDFC Diners Black Metal Spends Tracker</h2>
          <p className="text-zinc-500 text-sm mb-6">Enter your email and password to access the tracker.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="Email ID" className="w-full text-center text-lg font-medium border border-zinc-200 rounded-xl p-4 focus:ring-2 focus:ring-amber-500 outline-none bg-zinc-50" autoFocus />
            <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Password" className="w-full text-center text-lg font-medium border border-zinc-200 rounded-xl p-4 focus:ring-2 focus:ring-amber-500 outline-none bg-zinc-50" />
            {authError && <p className="text-red-500 text-sm font-medium">{authError}</p>}
            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-xl shadow-sm transition-colors">Secure Login</button>
          </form>
        </div>
        <div className="mt-8 text-zinc-500 text-xs font-medium relative z-10 flex items-center gap-2">
          <ShieldAlert size={14} /> Contact Rohit Chopra for any issues or access requirement
        </div>
      </div>
    );
  }

  const isPolicyUpdateDue = (new Date().getFullYear() - 2026) * 12 + (new Date().getMonth() - 5) >= 6;

  // Formatting strings for display
  let prevMonth = selMonth - 1; let prevYear = selYear;
  if (prevMonth === 0) { prevMonth = 12; prevYear--; }
  const stmtDateLabel = `16 ${MONTHS[prevMonth-1]} - 15 ${MONTHS[selMonth-1]}`;
  const calDateLabel = `${MONTHS[selMonth-1]} ${selYear}`;

  if (loading) return <div className="flex h-screen items-center justify-center bg-zinc-50"><div className="animate-pulse text-zinc-500 font-medium">Loading Diners Club Data...</div></div>;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-zinc-100 font-sans text-zinc-800">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-zinc-900 text-zinc-100 flex-col transition-all">
        <div className="p-6">
          <div className="flex items-center gap-3 text-amber-500 mb-2">
            <CreditCard size={28} />
            <h1 className="text-xl font-bold tracking-wider uppercase text-zinc-100">DCB Metal</h1>
          </div>
          <p className="text-xs text-zinc-400 font-medium tracking-wide">REWARDS TRACKER</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setActiveTab("dashboard")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === "dashboard" ? "bg-amber-500/10 text-amber-500" : "hover:bg-zinc-800 text-zinc-400"}`}><LayoutDashboard size={20} /> <span className="font-medium">Dashboard</span></button>
          <button onClick={() => setActiveTab("logs")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === "logs" ? "bg-amber-500/10 text-amber-500" : "hover:bg-zinc-800 text-zinc-400"}`}><List size={20} /> <span className="font-medium">Transactions</span></button>
          <button onClick={() => setActiveTab("rewards")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === "rewards" ? "bg-amber-500/10 text-amber-500" : "hover:bg-zinc-800 text-zinc-400"}`}><Gift size={20} /> <span className="font-medium">Rewards Ledger</span></button>
        </nav>
        <div className="p-4 space-y-2">
          <button onClick={() => setShowPolicyModal(true)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-zinc-400 hover:bg-zinc-800 transition-colors text-sm">
            <div className="flex items-center gap-3"><BookOpen size={18} /> <span className="font-medium">HDFC Policies</span></div>
            {isPolicyUpdateDue && <ShieldAlert size={16} className="text-amber-500" />}
          </button>
          <button onClick={() => setShowSettingsModal(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-zinc-800 transition-colors"><Settings size={20} /> <span className="font-medium">Settings</span></button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:bg-zinc-800 transition-colors text-xs text-left mt-4 border border-zinc-800"><Lock size={14} /> Lock Tracker</button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 w-full bg-zinc-900 border-t border-zinc-800 z-40 flex justify-around p-3 pb-safe shadow-2xl">
        <button onClick={() => setActiveTab("dashboard")} className={`flex flex-col items-center gap-1 ${activeTab === "dashboard" ? "text-amber-500" : "text-zinc-500"}`}><LayoutDashboard size={20} /><span className="text-[10px] font-medium">Dashboard</span></button>
        <button onClick={() => setActiveTab("logs")} className={`flex flex-col items-center gap-1 ${activeTab === "logs" ? "text-amber-500" : "text-zinc-500"}`}><List size={20} /><span className="text-[10px] font-medium">Logs</span></button>
        <button onClick={() => setActiveTab("rewards")} className={`flex flex-col items-center gap-1 ${activeTab === "rewards" ? "text-amber-500" : "text-zinc-500"}`}><Gift size={20} /><span className="text-[10px] font-medium">Rewards</span></button>
        <button onClick={() => setShowSettingsModal(true)} className="flex flex-col items-center gap-1 text-zinc-500"><Settings size={20} /><span className="text-[10px] font-medium">Settings</span></button>
      </nav>

      {/* Main App Content Area */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900">{filterHolder === "All" ? "Family" : filterHolder} Overview</h2>
              <p className="text-zinc-500 text-sm mt-1">Track family spends and maximize returns.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              
              {/* DATE VIEW TOGGLE (CALENDAR VS STATEMENT) */}
              <div className="bg-zinc-200 p-1 rounded-xl flex items-center shadow-inner mr-1">
                <button onClick={() => setViewMode("calendar")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'calendar' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                  Calendar
                </button>
                <button onClick={() => setViewMode("statement")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'statement' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                  Statement
                </button>
              </div>

              <div className="bg-white border border-zinc-200 px-3 py-2 rounded-xl flex items-center gap-2 shadow-sm relative flex-1 md:flex-none">
                <Filter size={16} className="text-amber-500" />
                <select value={filterHolder} onChange={(e) => setFilterHolder(e.target.value)} className="bg-transparent border-none focus:outline-none text-zinc-800 text-sm font-medium pr-4 appearance-none w-full cursor-pointer">
                  <option value="All">All Spends</option>
                  {cardholders.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-2.5 text-zinc-400 pointer-events-none" size={14} />
              </div>
              <div className="bg-white border border-zinc-200 px-3 py-2 rounded-xl flex items-center gap-1 shadow-sm flex-1 md:flex-none justify-center">
                <select value={selMonth} onChange={(e) => setSelMonth(Number(e.target.value))} className="bg-transparent text-sm font-bold text-zinc-800 outline-none appearance-none cursor-pointer">
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <span className="text-zinc-300">/</span>
                <select value={selYear} onChange={(e) => setSelYear(Number(e.target.value))} className="bg-transparent text-sm font-bold text-zinc-800 outline-none appearance-none cursor-pointer">
                  {[2024, 2025, 2026, 2027, 2028].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <button onClick={() => fileInputRef.current.click()} className="bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-800 px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 shadow-sm text-sm w-full md:w-auto transition-colors">
                <Upload size={16} className="text-blue-500" /> CSV
              </button>
              <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

              <button onClick={openAddModal} className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 shadow-sm text-sm w-full md:w-auto transition-colors">
                <Plus size={16} /> Add Spend
              </button>
            </div>
          </header>

          {activeTab === "dashboard" && (
            <div className="space-y-6">
              
              {/* PRIMARY SPEND BOX (Dynamically switches based on Calendar or Statement toggle) */}
              <div className="bg-white p-4 md:p-6 rounded-2xl border border-zinc-200 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <h3 className="text-lg font-bold text-zinc-900">
                    Total Spend <span className="text-zinc-400 font-normal">({viewMode === 'calendar' ? calDateLabel : `${stmtDateLabel}, ${selYear}`})</span>
                  </h3>
                  <div className="text-left md:text-right">
                    <div className="text-2xl md:text-3xl font-black text-zinc-800">₹ {viewStats.spend.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    <div className="text-sm font-bold text-green-600">+{filterHolder === "All" ? viewStats.points.toLocaleString("en-IN") : "Family Calc"} RP Earned in this view</div>
                  </div>
                </div>
                {filterHolder === "All" && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 border-t border-zinc-100">
                    {cardholders.map((holder) => (
                      <div key={holder} className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                        <div className="text-xs text-zinc-500 font-medium mb-1 truncate">{holder}</div>
                        <div className="text-base font-bold text-zinc-800">₹ {(viewStats.cardholderSpends[holder] || 0).toLocaleString("en-IN", {maximumFractionDigits: 2})}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center">
                  <div className="text-zinc-500 text-sm font-medium mb-2 flex justify-between items-center">
                    <span>{annualStats.label}</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${annualStats.progress >= 100 ? "text-green-700 bg-green-100" : "text-emerald-700 bg-emerald-50"}`}>Fee Waiver</span>
                  </div>
                  <div className="text-2xl font-bold text-zinc-900 mb-3">₹ {annualStats.spend.toLocaleString("en-IN", {maximumFractionDigits: 0})}<span className="text-xs font-normal text-zinc-400 ml-1">/ 8L</span></div>
                  <div className="w-full bg-zinc-100 rounded-full h-2 relative"><div className={`${annualStats.progress >= 100 ? "bg-green-500" : "bg-amber-500"} h-2 rounded-full transition-all`} style={{ width: `${annualStats.progress}%` }}></div></div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={64} /></div>
                  <div className="text-zinc-500 text-sm font-medium mb-2 flex justify-between items-center relative z-10">
                    <span>{quarterStats.label} Milestone</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${quarterStats.progress >= 100 ? "text-green-700 bg-green-100" : "text-amber-700 bg-amber-50"}`}>10K RP</span>
                  </div>
                  <div className="text-2xl font-bold text-zinc-900 relative z-10 mb-3">₹ {quarterStats.spend.toLocaleString("en-IN", {maximumFractionDigits: 0})}<span className="text-xs font-normal text-zinc-400 ml-1">/ 4L</span></div>
                  <div className="w-full bg-zinc-100 rounded-full h-2 relative z-10"><div className={`${quarterStats.progress >= 100 ? "bg-green-500" : "bg-amber-500"} h-2 rounded-full transition-all`} style={{ width: `${quarterStats.progress}%` }}></div></div>
                </div>

                {filterHolder === "All" ? (
                  <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-6 rounded-2xl shadow-sm text-white flex flex-col justify-center">
                    <div className="font-medium mb-1 text-sm flex items-center gap-2 opacity-90"><Award size={16} /> Annual RP Earned</div>
                    <div className="text-3xl font-bold text-amber-500">{annualStats.earnedRP.toLocaleString("en-IN")}<span className="text-sm opacity-80 font-medium ml-1 text-white">RP</span></div>
                    <div className="text-[10px] text-zinc-400 mt-2 font-medium">Cycle: Jun 2026 - May 2027</div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-6 rounded-2xl shadow-sm text-white flex flex-col justify-center">
                    <div className="font-medium mb-1 text-sm flex items-center gap-2 opacity-90"><Gift size={16} /> Available Reward Points</div>
                    <div className="text-3xl font-bold text-white">{(rewardsBalance[filterHolder]?.available || 0).toLocaleString("en-IN")}<span className="text-sm opacity-80 font-medium ml-1 text-white">RP</span></div>
                    <div className="text-[10px] text-amber-100 mt-2 font-medium">Includes manual adjustments</div>
                  </div>
                )}
              </div>

              {/* HDFC Bank Fees Tracker Card */}
              <div className="bg-white p-4 md:p-6 rounded-2xl border border-zinc-200 shadow-sm">
                <h3 className="text-base md:text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
                  <AlertCircle className="text-red-500" size={18} /> Bank Surcharges & Fees (1%)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 col-span-2 md:col-span-1">
                    <div className="text-xs text-red-600 font-bold mb-1 uppercase tracking-wider">Total Fees</div>
                    <div className="text-xl font-black text-red-700">₹ {viewStats.fees.toLocaleString("en-IN", {maximumFractionDigits: 2})}</div>
                  </div>
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                    <div className="text-xs text-zinc-500 font-medium mb-1">Rental Fees</div>
                    <div className="text-lg font-bold text-zinc-800">₹ {(viewStats.feeBreakdown.rent).toLocaleString("en-IN", {maximumFractionDigits: 2})}</div>
                  </div>
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                    <div className="text-xs text-zinc-500 font-medium mb-1">Utility (&gt;50k)</div>
                    <div className="text-lg font-bold text-zinc-800">₹ {(viewStats.feeBreakdown.utility).toLocaleString("en-IN", {maximumFractionDigits: 2})}</div>
                  </div>
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                    <div className="text-xs text-zinc-500 font-medium mb-1">Fuel (&gt;15k)</div>
                    <div className="text-lg font-bold text-zinc-800">₹ {(viewStats.feeBreakdown.fuel).toLocaleString("en-IN", {maximumFractionDigits: 2})}</div>
                  </div>
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                    <div className="text-xs text-zinc-500 font-medium mb-1">Education</div>
                    <div className="text-lg font-bold text-zinc-800">₹ {(viewStats.feeBreakdown.education).toLocaleString("en-IN", {maximumFractionDigits: 2})}</div>
                  </div>
                </div>
              </div>

              {/* MONTHLY CAP STATUS - This ALWAYS stays strictly bound to Calendar Month logic */}
              <div className="bg-white p-4 md:p-6 rounded-2xl border border-zinc-200 shadow-sm border-t-4 border-t-green-500">
                <h3 className="text-base md:text-lg font-bold text-zinc-900 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="text-green-500" size={18} /> Official Calendar Month Caps
                </h3>
                <p className="text-xs text-zinc-500 mb-6">These rules are locked to the 1st of every month ({calDateLabel}), regardless of your statement cycle.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-6">
                  <div>
                    <div className="flex justify-between text-xs md:text-sm mb-2 font-medium"><span className="text-zinc-700">SmartBuy Bonus</span><span className={calendarCappingStats.smartBuyBonusRP >= CAPS.SMARTBUY_BONUS_MONTHLY ? "text-red-500" : "text-zinc-500"}>{calendarCappingStats.smartBuyBonusRP.toLocaleString("en-IN")} / 10,000</span></div>
                    <div className="w-full bg-zinc-100 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${calendarCappingStats.smartBuyBonusRP >= CAPS.SMARTBUY_BONUS_MONTHLY ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${Math.min((calendarCappingStats.smartBuyBonusRP / CAPS.SMARTBUY_BONUS_MONTHLY) * 100, 100)}%` }}></div></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs md:text-sm mb-2 font-medium"><span className="text-zinc-700">Grocery Points</span><span className={calendarCappingStats.groceryMonthlyRewardCap >= CAPS.groceryMonthlyRewardCap ? "text-red-500" : "text-zinc-500"}>{calendarCappingStats.groceryMonthlyRewardCap.toLocaleString("en-IN")} / 2,000</span></div>
                    <div className="w-full bg-zinc-100 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${calendarCappingStats.groceryMonthlyRewardCap >= CAPS.groceryMonthlyRewardCap ? "bg-red-500" : "bg-green-500"}`} style={{ width: `${Math.min((calendarCappingStats.groceryMonthlyRewardCap / CAPS.groceryMonthlyRewardCap) * 100, 100)}%` }}></div></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs md:text-sm mb-2 font-medium"><span className="text-zinc-700">Telecom Points</span><span className={calendarCappingStats.telecomMonthlyRewardCap >= CAPS.telecomMonthlyRewardCap ? "text-red-500" : "text-zinc-500"}>{calendarCappingStats.telecomMonthlyRewardCap.toLocaleString("en-IN")} / 2,000</span></div>
                    <div className="w-full bg-zinc-100 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${calendarCappingStats.telecomMonthlyRewardCap >= CAPS.telecomMonthlyRewardCap ? "bg-red-500" : "bg-indigo-500"}`} style={{ width: `${Math.min((calendarCappingStats.telecomMonthlyRewardCap / CAPS.telecomMonthlyRewardCap) * 100, 100)}%` }}></div></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs md:text-sm mb-2 font-medium"><span className="text-zinc-700">Utility Points</span><span className={calendarCappingStats.utilityMonthlyRewardCap >= CAPS.utilityMonthlyRewardCap ? "text-red-500" : "text-zinc-500"}>{calendarCappingStats.utilityMonthlyRewardCap.toLocaleString("en-IN")} / 2,000</span></div>
                    <div className="w-full bg-zinc-100 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${calendarCappingStats.utilityMonthlyRewardCap >= CAPS.utilityMonthlyRewardCap ? "bg-red-500" : "bg-purple-500"}`} style={{ width: `${Math.min((calendarCappingStats.utilityMonthlyRewardCap / CAPS.utilityMonthlyRewardCap) * 100, 100)}%` }}></div></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs md:text-sm mb-2 font-medium"><span className="text-zinc-700">Insurance Points</span><span className={calendarCappingStats.insuranceMonthlyRewardCap >= CAPS.insuranceMonthlyRewardCap ? "text-red-500" : "text-zinc-500"}>{calendarCappingStats.insuranceMonthlyRewardCap.toLocaleString("en-IN")} / 5,000</span></div>
                    <div className="w-full bg-zinc-100 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${calendarCappingStats.insuranceMonthlyRewardCap >= CAPS.insuranceMonthlyRewardCap ? "bg-red-500" : "bg-pink-500"}`} style={{ width: `${Math.min((calendarCappingStats.insuranceMonthlyRewardCap / CAPS.insuranceMonthlyRewardCap) * 100, 100)}%` }}></div></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500">
                      <th className="p-4 font-medium">Date</th>
                      <th className="p-4 font-medium">Cardholder</th>
                      <th className="p-4 font-medium">Category & Remarks</th>
                      <th className="p-4 font-medium text-right">Amount (₹)</th>
                      <th className="p-4 font-medium text-right">Points</th>
                      <th className="p-4 font-medium text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredTxns.length === 0 ? (
                      <tr><td colSpan="6" className="p-8 text-center text-zinc-500">No transactions found for this period view.</td></tr>
                    ) : (
                      filteredTxns.map((txn) => (
                        <tr key={txn.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="p-4 text-sm text-zinc-800">{formatDate(txn.date)}</td>
                          <td className="p-4 text-sm"><span className="bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-md font-medium text-xs">{txn.cardHolder}</span></td>
                          <td className="p-4 text-sm text-zinc-800">
                            {txn.categoryLabel}
                            {txn.remarks && <span className="block text-xs text-zinc-500 mt-0.5">{txn.remarks}</span>}
                            {txn.feeNote && <span className="block text-[10px] text-red-500 mt-0.5 font-bold uppercase tracking-wider">{txn.feeNote}</span>}
                            {txn.note && <span className="block text-[10px] text-amber-500 mt-0.5 font-bold uppercase tracking-wider">{txn.note}</span>}
                          </td>
                          <td className="p-4 text-sm font-medium text-zinc-900 text-right">₹ {Number(txn.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          
                          <td className="p-4 text-right align-middle">
                            {txn.earnedRP === 0 ? (
                              <span className="text-sm font-bold text-zinc-400">0</span>
                            ) : (
                              <div className="flex flex-col items-end">
                                <span className="text-sm font-bold text-green-600">+{txn.baseRP} Base</span>
                                {txn.bonusRP > 0 && (
                                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mt-0.5">
                                    +{txn.bonusRP} Bonus
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-1">
                              <button onClick={() => openEditModal(txn)} className="text-zinc-400 hover:text-blue-500 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"><Edit size={16} /></button>
                              <button onClick={() => handleDelete(txn.id)} className="text-zinc-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "rewards" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
                <div>
                  <h3 className="font-bold text-zinc-900">Rewards Ledger</h3>
                  <p className="text-xs text-zinc-500 mt-1">Manage manual adjustments and redemptions.</p>
                </div>
                <button onClick={() => setShowRewardModal(true)} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm">Log Points</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cardholders.map(holder => (
                  <div key={holder} className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="font-bold text-zinc-900 mb-4 pb-2 border-b border-zinc-100">{holder}</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-zinc-500"><span>Earned (All Time)</span><span>{rewardsBalance[holder].earned.toLocaleString()} RP</span></div>
                      <div className="flex justify-between text-zinc-500"><span>Manual Adjustments</span><span className="text-green-600">+{rewardsBalance[holder].adjustments.toLocaleString()} RP</span></div>
                      <div className="flex justify-between text-zinc-500"><span>Redemptions</span><span className="text-red-500">-{rewardsBalance[holder].redemptions.toLocaleString()} RP</span></div>
                      <div className="flex justify-between font-bold text-zinc-900 pt-2 border-t border-zinc-100 mt-2"><span>Available Balance</span><span className="text-amber-500">{rewardsBalance[holder].available.toLocaleString()} RP</span></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mt-6">
                <div className="p-4 bg-zinc-50 border-b border-zinc-200 font-bold text-sm text-zinc-700">Manual Points Log</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap">
                    <tbody className="divide-y divide-zinc-100">
                      {rewardsLog.length === 0 ? <tr><td className="p-6 text-center text-sm text-zinc-500">No manual points logged yet.</td></tr> : rewardsLog.sort((a,b) => new Date(b.date) - new Date(a.date)).map(log => (
                        <tr key={log.id} className="hover:bg-zinc-50">
                          <td className="p-4 text-sm text-zinc-500 w-32">{formatDate(log.date)}</td>
                          <td className="p-4 text-sm font-medium">{log.cardHolder}</td>
                          <td className="p-4 text-sm">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${log.type === 'adjustment' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {log.type === 'adjustment' ? <PlusCircle size={12}/> : <MinusCircle size={12}/>} {log.type.toUpperCase()}
                            </span>
                            {log.remarks && <span className="ml-2 text-zinc-500">{log.remarks}</span>}
                          </td>
                          <td className={`p-4 text-sm font-bold text-right ${log.type === 'adjustment' ? 'text-green-600' : 'text-red-500'}`}>
                            {log.type === 'adjustment' ? '+' : '-'}{log.points.toLocaleString()}
                          </td>
                          <td className="p-4 text-center w-16">
                            <button onClick={() => handleDeleteReward(log.id)} className="text-zinc-400 hover:text-red-500"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* --- CSV STAGING WIZARD MODAL --- */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50 rounded-t-2xl">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <FileText className="text-blue-500" size={20} /> CSV Import Wizard
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Assign categories to your new transactions before saving.</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-zinc-400 hover:text-zinc-600 bg-white p-2 rounded-full shadow-sm border border-zinc-200">✕</button>
            </div>
            
            <div className="overflow-y-auto p-0 flex-1">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="border-b border-zinc-200 text-[11px] uppercase tracking-wider text-zinc-500">
                    <th className="p-3 text-center"><CheckCircle2 size={16} className="mx-auto" /></th>
                    <th className="p-3 font-bold">Date & Cardholder</th>
                    <th className="p-3 font-bold">Description</th>
                    <th className="p-3 font-bold text-right">Amount</th>
                    <th className="p-3 font-bold">Assign Category</th>
                    <th className="p-3 font-bold text-right">Points Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {stagedTxns.length === 0 ? (
                    <tr><td colSpan="6" className="p-10 text-center text-zinc-500">No valid debits found in this CSV file.</td></tr>
                  ) : (
                    stagedTxns.map((txn) => {
                      const category = CATEGORIES.find(c => c.id === txn.categoryId);
                      const baseRP = category.baseEligible ? Math.floor(txn.amount / 150) * 5 : 0;
                      let bonusRP = 0;
                      if (category.smartbuy) bonusRP = Math.floor(txn.amount / 150) * 5 * (category.multiplier - 1);
                      if (category.id === 'weekend-dining') bonusRP = Math.floor(txn.amount / 150) * 5;

                      return (
                        <tr key={txn.id} className={`hover:bg-zinc-50 ${!txn.selected ? 'opacity-50 grayscale' : ''}`}>
                          <td className="p-3 text-center">
                            <input type="checkbox" checked={txn.selected} onChange={e => updateStagedTxn(txn.id, 'selected', e.target.checked)} className="w-4 h-4 text-blue-500 rounded border-zinc-300 focus:ring-blue-500" />
                          </td>
                          <td className="p-3">
                            <div className="text-sm font-bold text-zinc-800">{formatDate(txn.date)}</div>
                            <select value={txn.cardHolder} onChange={e => updateStagedTxn(txn.id, 'cardHolder', e.target.value)} className="text-[10px] bg-zinc-100 border border-zinc-200 rounded px-1 py-0.5 mt-1 outline-none text-zinc-700">
                              {cardholders.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </td>
                          <td className="p-3">
                            <input type="text" value={txn.remarks} onChange={e => updateStagedTxn(txn.id, 'remarks', e.target.value)} className="text-sm bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-blue-500 outline-none w-48 text-zinc-700" />
                            {txn.isDuplicate && <div className="text-[10px] text-red-500 font-bold mt-1">Already in Tracker (Auto-Skipped)</div>}
                          </td>
                          <td className="p-3 text-sm font-bold text-zinc-900 text-right">₹ {txn.amount.toLocaleString("en-IN", {minimumFractionDigits:2})}</td>
                          <td className="p-3">
                            <select value={txn.categoryId} onChange={e => updateStagedTxn(txn.id, 'categoryId', e.target.value)} className="w-full text-sm border border-zinc-200 rounded-lg p-2 bg-white outline-none focus:ring-2 focus:ring-blue-500">
                              {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                            </select>
                          </td>
                          <td className="p-3 text-right align-middle">
                            {baseRP === 0 && bonusRP === 0 ? (
                              <span className="text-sm font-bold text-zinc-400">0</span>
                            ) : (
                              <div className="flex flex-col items-end">
                                {baseRP > 0 && <span className="text-sm font-bold text-green-600">+{baseRP} Base</span>}
                                {bonusRP > 0 && <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mt-0.5">+{bonusRP} Bonus</span>}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-5 border-t border-zinc-100 bg-zinc-50 rounded-b-2xl flex justify-between items-center">
              <div className="text-sm text-zinc-600 font-medium">
                Ready to import: <span className="font-bold text-blue-600">{stagedTxns.filter(t => t.selected).length}</span> transactions
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowUploadModal(false)} className="px-5 py-2.5 border border-zinc-200 text-zinc-700 font-bold text-sm rounded-xl hover:bg-white">Discard</button>
                <button onClick={handleImportStaged} disabled={stagedTxns.filter(t => t.selected).length === 0} className="px-5 py-2.5 bg-blue-600 disabled:bg-blue-300 text-white font-bold text-sm rounded-xl shadow-sm hover:bg-blue-700 transition-colors">
                  Save to Tracker
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white z-10 p-5 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-zinc-900">{isEditing ? "Edit Spend" : "Log Spend"}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-zinc-600">✕</button>
            </div>
            <form onSubmit={handleAddTransaction} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase">Date</label>
                  <input type="date" required value={newTxn.date} onChange={(e) => setNewTxn({ ...newTxn, date: e.target.value })} className="w-full border border-zinc-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase">Amount (₹)</label>
                  <input type="number" step="0.01" required min="0.01" placeholder="5000" value={newTxn.amount} onChange={(e) => setNewTxn({ ...newTxn, amount: e.target.value })} className="w-full border border-zinc-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase">Cardholder</label>
                <div className="relative">
                  <select value={newTxn.cardHolder || (cardholders.length > 0 ? cardholders[0] : "")} onChange={(e) => setNewTxn({ ...newTxn, cardHolder: e.target.value })} className="w-full border border-zinc-200 rounded-xl p-3 appearance-none focus:ring-2 focus:ring-amber-500 outline-none bg-white text-sm">
                    {cardholders.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 text-zinc-400 pointer-events-none" size={16} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase">Category</label>
                <div className="relative">
                  <select value={newTxn.categoryId} onChange={(e) => setNewTxn({ ...newTxn, categoryId: e.target.value })} className="w-full border border-zinc-200 rounded-xl p-3 appearance-none focus:ring-2 focus:ring-amber-500 outline-none bg-white text-sm">
                    {CATEGORIES.map((cat) => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 text-zinc-400 pointer-events-none" size={16} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase">Remarks / Refund Note</label>
                <input type="text" placeholder="e.g., Amazon Shopping, Partial Refund..." value={newTxn.remarks} onChange={(e) => setNewTxn({ ...newTxn, remarks: e.target.value })} className="w-full border border-zinc-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 outline-none text-sm" />
              </div>

              {isEditing && (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-2 mt-2">
                  <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider">Log a Partial Refund</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Refund Amount (₹)"
                      value={refundInput}
                      onChange={(e) => setRefundInput(e.target.value)}
                      className="flex-1 border border-amber-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!refundInput || isNaN(refundInput) || Number(refundInput) <= 0) return;
                        const newAmt = Math.max(0, Number(newTxn.amount) - Number(refundInput));
                        const refundMsg = `Refund: ₹${refundInput}`;
                        setNewTxn(prev => ({
                          ...prev,
                          amount: Number(newAmt.toFixed(2)),
                          remarks: prev.remarks ? `${prev.remarks} | ${refundMsg}` : refundMsg
                        }));
                        setRefundInput("");
                      }}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-2 rounded-lg text-sm transition-colors shadow-sm"
                    >
                      Deduct
                    </button>
                  </div>
                  <p className="text-[10px] text-amber-700 font-medium leading-tight">
                    This automatically subtracts the refund from the main amount above and adds a note.
                  </p>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => { setShowAddModal(false); setRefundInput(""); }} className="flex-1 px-4 py-3 border border-zinc-200 text-zinc-700 font-bold text-sm rounded-xl hover:bg-zinc-50">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-zinc-900 text-white font-bold text-sm rounded-xl hover:bg-zinc-800">{isEditing ? "Save Changes" : "Save Spend"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Reward Points Modal */}
      {showRewardModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-zinc-900">Log Manual Points</h3>
              <button onClick={() => setShowRewardModal(false)} className="text-zinc-400 hover:text-zinc-600">✕</button>
            </div>
            <form onSubmit={handleAddReward} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase">Type</label>
                  <select value={newReward.type} onChange={e => setNewReward({...newReward, type: e.target.value})} className="w-full border border-zinc-200 rounded-xl p-3 bg-white text-sm outline-none">
                    <option value="adjustment">Adjustment (+)</option>
                    <option value="redemption">Redemption (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase">Points</label>
                  <input type="number" required min="1" placeholder="e.g. 500" value={newReward.points} onChange={e => setNewReward({...newReward, points: e.target.value})} className="w-full border border-zinc-200 rounded-xl p-3 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase">Cardholder</label>
                <select value={newReward.cardHolder} onChange={e => setNewReward({...newReward, cardHolder: e.target.value})} className="w-full border border-zinc-200 rounded-xl p-3 bg-white text-sm outline-none">
                  {cardholders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase">Remarks</label>
                <input type="text" placeholder="e.g., Missing points credited, Flight booking..." value={newReward.remarks} onChange={e => setNewReward({...newReward, remarks: e.target.value})} className="w-full border border-zinc-200 rounded-xl p-3 outline-none text-sm" />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowRewardModal(false)} className="flex-1 px-4 py-3 border border-zinc-200 text-zinc-700 font-bold text-sm rounded-xl">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-amber-500 text-white font-bold text-sm rounded-xl hover:bg-amber-600">Save Points</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-zinc-900">Manage Cardholders</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-zinc-400 hover:text-zinc-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-[11px] font-medium text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                If you rename a cardholder here, the app will automatically update all of their historical transactions so you don't lose any data!
              </p>
              {editHolders.map((holder, index) => (
                <div key={index}>
                  <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">{index === 0 ? "Primary Card" : `Add-on ${index}`}</label>
                  <input type="text" value={holder} onChange={(e) => { const newH = [...editHolders]; newH[index] = e.target.value; setEditHolders(newH); }} className="w-full border border-zinc-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 outline-none font-medium text-sm" />
                </div>
              ))}
              <div className="pt-2 flex gap-3">
                <button onClick={() => setShowSettingsModal(false)} className="flex-1 px-4 py-3 border border-zinc-200 text-zinc-700 font-bold text-sm rounded-xl hover:bg-zinc-50">Cancel</button>
                <button onClick={handleSaveSettings} className="flex-1 px-4 py-3 bg-zinc-900 text-white font-bold text-sm rounded-xl hover:bg-zinc-800">Save Names</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Policy Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-screen flex flex-col animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><BookOpen size={20} className="text-amber-500" /> Official HDFC Policies</h3>
              <button onClick={() => setShowPolicyModal(false)} className="text-zinc-400 hover:text-zinc-600">✕</button>
            </div>
            <div className="p-5 overflow-y-auto space-y-5">
              {isPolicyUpdateDue ? (
                <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm flex items-start gap-3 border border-amber-200"><ShieldAlert size={20} className="shrink-0 mt-0.5 text-amber-600" /><div><strong>Policy Verification Due!</strong> It has been over 6 months since this app's rules were locked (June 2026). Please open the links below to verify if HDFC has changed any caps.</div></div>
              ) : (
                <div className="bg-green-50 text-green-800 p-4 rounded-xl text-sm flex items-start gap-3 border border-green-200"><CheckCircle2 size={20} className="shrink-0 mt-0.5 text-green-600" /><div><strong>Rules are up to date.</strong> This tracker is locked to the HDFC rules published in June 2026.</div></div>
              )}
              <div className="space-y-2">
                {[
                  { title: "HDFC Bank MITC", sub: "Baseline: Updated 27 May 2026", link: "https://www.hdfc.bank.in/content/dam/hdfcbankpws/in/en/personal-banking/discover-products/cards/credit-cards/personal-mitc/mitc-in-english.pdf" },
                  { title: "Diners Black Metal T&C", sub: "Baseline: 1 June 2026", link: "https://www.hdfc.bank.in/content/dam/hdfcbankpws/in/en/personal-banking/discover-products/cards/credit-cards/diners-club-black-metal-edition-credit-card/diners-club-metal-tandc.pdf" },
                  { title: "SmartBuy Core Benefit Offer", sub: "10X/5X/3X Multiplier Validations", link: "https://offers.smartbuy.hdfc.bank.in/offer_details/smartbuy/15282" },
                  { title: "HDFC SMS Communication Charges", sub: "Validates the 1% fee on Rent & Utilities", link: "https://v.hdfc.bank.in/htdocs/common/sms-communication.html" }
                ].map(doc => (
                  <a key={doc.title} href={doc.link} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 hover:border-amber-500 hover:bg-amber-50 transition-colors group">
                    <div><div className="text-sm font-bold text-zinc-800 group-hover:text-amber-700">{doc.title}</div><div className="text-xs text-zinc-500">{doc.sub}</div></div>
                    <ExternalLink size={16} className="text-zinc-400 group-hover:text-amber-600" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
