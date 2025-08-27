"use client"
import { useRef } from "react"
import { getBaseUrl } from "@/utils/api"
import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StatusBar,
  Image,
} from "react-native"
import { useRouter } from "expo-router"
import { BarChart } from "react-native-chart-kit"
import axios from "axios"
import { useAuthContext } from "../../contexts/AuthProvider"
import { useProtectedRoute } from "../../hooks/useProtectedRoute"
import { useFocusEffect } from "@react-navigation/native"
import { useCallback } from "react"
import Icon from "react-native-vector-icons/Feather"
import { SafeAreaView } from "react-native-safe-area-context"
import StockModal from "@/components/StockModal"
import { Picker } from "@react-native-picker/picker" // Assuming this is available or can be installed

// Types
interface ChartData {
  labels: string[]
  datasets: { data: number[] }[]
}

interface PeriodData {
  revenue: number | string
  totalSales: number
  profit: number
  progress?: string
  since?: string
  month?: string
}

interface ProfitDivision {
  settings: {
    investment_percentage: number
    partner_percentage: number
  }
  amounts: {
    investment: number
    partner: number
  }
  profit: number
}

interface DailyRevenue {
  date: string
  revenue: number
  totalSales?: number // Added for daily stats
  profit?: number // Added for daily stats
}

interface Transaction {
  id: string
  type: "revenue" | "expense"
  amount: number
  description: string
  date: string // ISO string
}

interface CaisseData {
  revenue: number
  expense: number
  balance: number
}

interface DailyStats {
  revenue: number
  totalSales: number
  profit: number
}

interface MonthlyStats {
  revenue: number
  totalSales: number
  profit: number
}

interface YearlyStats {
  revenue: number
  totalSales: number
  profit: number
}

interface DashboardData {
  today: PeriodData
  yesterday: PeriodData
  thisWeek: PeriodData
  thisMonth: PeriodData
  total: {
    revenue: number | string
    totalSales: number
    profit: number | string
  }
  revenue: number
  profit: number
  stockValue: number
  saleCountChart: ChartData
  saleValueChart: ChartData
  profitDivision: ProfitDivision // Default profit division (e.g., current month)
  monthlyRevenueChart: ChartData
  dailyRevenue: DailyRevenue[] // This is just date and revenue, not full stats
  caisse: CaisseData // New
  lastTransactions: Transaction[] // New
}


type DayStats = {
  revenue: number
  totalSales: number
}

interface StockCategory {
  category: string
  quantity: number
  value: number
}
// Component
const HomePageScreen = () => {
  useProtectedRoute()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { user } = useAuthContext()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentDateProfitDivision, setCurrentDateProfitDivision] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDayStats, setSelectedDayStats] = useState<DailyStats | null>(null)
  const [selectedMonthStats, setSelectedMonthStats] = useState<MonthlyStats | null>(null)
  const [selectedYearStats, setSelectedYearStats] = useState<YearlyStats | null>(null)

  const [isStockModalVisible, setIsStockModalVisible] = useState(false)
  const [stockCategoriesData, setStockCategoriesData] = useState<StockCategory[]>([])

  // Profit Division Filter State
  const monthNames = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Aout",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ]
  const currentMonthName = monthNames[new Date().getMonth()]
  const [selectedProfitMonth, setSelectedProfitMonth] = useState<string>(monthNames[new Date().getMonth()])
  const [selectedProfitYear, setSelectedProfitYear] = useState<number>(new Date().getFullYear())
  const [currentProfitDivision, setCurrentProfitDivision] = useState<ProfitDivision | null>(null)

  // Fetch dashboard data on component mount
  useEffect(() => {
    fetchDashboardData()
  }, [])
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData()
    }, []),
  )

  // Function to fetch dashboard data from API
  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${getBaseUrl()}/api/dashboard`)
      setDashboardData(response.data)
      // Set initial profit division to the one from dashboard data
      setCurrentProfitDivision(response.data.profitDivision)

      // Set initial selected date to today and fetch its stats
      const today = new Date()
      setSelectedDate(today)
      await fetchDailyStats(today.getDate(), today.getMonth(), today.getFullYear())
      await fetchMonthlyStats(today.getMonth(), today.getFullYear())
      await fetchYearlyStats(today.getFullYear())
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Fetch profit division for a specific month/year
  const fetchProfitDivisionForSelectedMonth = async (monthName: string, year: number) => {
    try {
      // Simulate API call for profit division by month
      const monthIndex = monthNames.indexOf(monthName)
      const response = await axios.get(`${getBaseUrl()}/api/profit-division?month=${monthIndex + 1}&year=${year}`)
      setCurrentProfitDivision(response.data)
    } catch (error) {
      console.error("Error fetching profit division for month:", error)
      // Fallback to default or show error
      setCurrentProfitDivision(dashboardData?.profitDivision || null)
    }
  }

  useEffect(() => {
    if (dashboardData) {
      fetchProfitDivisionForSelectedMonth(selectedProfitMonth, selectedProfitYear)
    }

    getStatisticsDetailsData();
  }, [selectedProfitMonth, selectedProfitYear, dashboardData])

  const getStatisticsDetailsData = async () => {


    const dayStats = await fetchDailyStats(currentDate.getDate(), currentDate.getMonth(), currentDate.getFullYear())
    setSelectedDayStats(dayStats)

    const monthStats = await fetchMonthlyStats(currentDate.getMonth(), currentDate.getFullYear())
    setSelectedMonthStats(monthStats)

    const yearStats = await fetchYearlyStats(currentDate.getFullYear())
    setSelectedYearStats(yearStats)
  }

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true)
    fetchDashboardData()
  }

  const fetchStockCategories = async () => {
    const response = await axios.get(`${getBaseUrl()}/api/stock-categories`)
    setStockCategoriesData(response.data)
    setIsStockModalVisible(true)
  }

  // Format currency helper
  const formatCurrency = (value: number | string = 0) => {
    const numValue = Number(value)
    const parts = numValue.toFixed(2).split(".") // ✅ ensures 2 decimals
    return {
      whole: parts[0],
      decimal: parts[1],
    }
  }

  // Calendar helper functions
  const getMonthName = (date: Date) => {
    return monthNames[date.getMonth()]
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    // getDay() returns 0 for Sunday, 1 for Monday, etc.
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const navigateMonth = async (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
    // When navigating month, clear selected date and stats, or select first day of new month
    setSelectedDate(null) // Clear selection
    setSelectedDayStats(null)
    setSelectedMonthStats(null)
    setSelectedYearStats(null)
  }

  const profifDivisionNavigateMonth = async (direction: "prev" | "next") => {
    const newDate = new Date(currentDateProfitDivision);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDateProfitDivision(newDate);

    try {
      const month = newDate.getMonth() + 1;
      const year = newDate.getFullYear();

      const response = await axios.get<ProfitDivision>(
        `${getBaseUrl()}/api/profit-division?month=${month}&year=${year}`
      );

      setCurrentProfitDivision(response.data);
    } catch (error) {
      console.error("Error fetching profit division:", error);
    }
  };

  const isToday = (day: number) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    )
  }

  const isSelectedDate = (day: number) => {
    if (!selectedDate) return false
    return (
      day === selectedDate.getDate() &&
      currentDate.getMonth() === selectedDate.getMonth() &&
      currentDate.getFullYear() === selectedDate.getFullYear()
    )
  }

  // New fetch functions for daily, monthly, yearly stats
  const fetchDailyStats = async (day: number, month: number, year: number): Promise<DailyStats> => {
    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    try {
      // Simulate API call
      const response = await axios.get(`${getBaseUrl()}/api/daily-stats?date=${dateString}`)
      return response.data // Should contain revenue, totalSales, profit
    } catch (error) {
      console.error("Failed to fetch daily stats:", error)
      return { revenue: 0, totalSales: 0, profit: 0 }
    }
  }

  const fetchMonthlyStats = async (month: number, year: number): Promise<MonthlyStats> => {
    try {
      const response = await axios.get(`${getBaseUrl()}/api/monthly-stats?month=${month + 1}&year=${year}`)


      return response.data // Should contain revenue, totalSales, profit
    } catch (error) {
      console.error("Failed to fetch monthly stats:", error)
      return { revenue: 0, totalSales: 0, profit: 0 }
    }
  }

  const fetchYearlyStats = async (year: number): Promise<YearlyStats> => {
    try {
      // Simulate API call
      const response = await axios.get(`${getBaseUrl()}/api/yearly-stats?year=${year}`)
      return response.data // Should contain revenue, totalSales, profit
    } catch (error) {
      console.error("Failed to fetch yearly stats:", error)
      return { revenue: 0, totalSales: 0, profit: 0 }
    }
  }

  const handleDayPress = async (day: number) => {
    const newSelectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    setSelectedDate(newSelectedDate)

    const dayStats = await fetchDailyStats(day, currentDate.getMonth(), currentDate.getFullYear())
    setSelectedDayStats(dayStats)

    const monthStats = await fetchMonthlyStats(currentDate.getMonth(), currentDate.getFullYear())
    setSelectedMonthStats(monthStats)

    const yearStats = await fetchYearlyStats(currentDate.getFullYear())
    setSelectedYearStats(yearStats)
  }

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={[styles.calendarDay, styles.calendarDayEmpty]} />)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isCurrentDay = isToday(day)
      const isSelected = isSelectedDate(day)
      const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      const dailyRevenueData = dashboardData?.dailyRevenue?.find((item) => item.date === dateString)
      const dayRevenue = dailyRevenueData?.revenue ?? 0

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            isCurrentDay && styles.calendarDayToday,
            isSelected && styles.calendarDaySelected,
          ]}
          onPress={() => handleDayPress(day)}
        >
          <Text
            style={[
              styles.calendarDayNumber,
              { color: isCurrentDay ? "#fff" : "#333" },
              isSelected && styles.calendarDayNumberSelected,
            ]}
          >
            {day}
          </Text>
          {dayRevenue > 0 && (
            <Text style={[styles.calendarDayRevenue, isSelected && styles.calendarDayRevenueSelected]}>
              {dayRevenue.toFixed(0)} DT
            </Text>
          )}
        </TouchableOpacity>,
      )
    }

    return days
  }

  const scrollViewRef = useRef(null)
  const chartRef = useRef(null)

  const scrollToChart = () => {
    chartRef.current?.measureLayout(scrollViewRef.current, (x, y) => {
      scrollViewRef.current.scrollTo({ y: y, animated: true })
    })
  }

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    )
  }

  if (!dashboardData) return null

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#EFF3F6" />
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6A3DE8"]} />}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Bienvenue,</Text>
            <Text style={styles.headerTitle}>{user?.name}</Text>
            <Text style={styles.progressText}>Votre progression</Text>
          </View>
        </View>


        {/* Today Card - Full Width */}
        <View style={styles.cardsContainer}>
          <View style={[styles.card, { backgroundColor: "#6A3DE8" }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: "#fff" }]}>Aujourd'hui</Text>
            </View>
            <View style={styles.todayCardContent}>
              <View style={styles.cardItem}>
                <View style={styles.currencyCircle}>
                  <Image source={require("../../assets/images/yellow-dollar.png")} style={{ width: 30, height: 30 }} />
                </View>
                <Text style={{ color: "#fff", flexDirection: "row", fontWeight: "bold" }}>
                  <Text style={{ fontSize: 22 }}>{formatCurrency(dashboardData.today.revenue).whole}</Text>
                  <Text style={{ fontSize: 18 }}>.{formatCurrency(dashboardData.today.revenue).decimal} TND</Text>
                </Text>
              </View>
              <View style={styles.cardItem}>
                <Image
                  source={require("../../assets/images/yellow-shopping-cart.png")}
                  style={{ width: 26, height: 26, marginRight: 8 }}
                />
                <Text style={[styles.cardValue, { color: "#fff", fontSize: 22 }]}>
                  {dashboardData.today.totalSales}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* This Month and Total Cards Row */}
        <TouchableOpacity onPress={scrollToChart}>
          <View style={styles.cardRow}>
            {/* This Month Card */}
            <View style={[styles.card, styles.halfWidthCard, { backgroundColor: "#26A69A" }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: "#fff" }]}>{currentMonthName}</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardItem}>
                  <View style={styles.currencyCircle}>
                    <Image source={require("../../assets/images/dollar.png")} style={{ width: 25, height: 25 }} />
                  </View>
                  <Text style={{ color: "#fff", flexDirection: "row", fontWeight: "bold" }}>
                    <Text style={{ fontSize: 20 }}>{formatCurrency(dashboardData.thisMonth.revenue).whole}</Text>
                    <Text style={{ fontSize: 12 }}>.{formatCurrency(dashboardData.thisMonth.revenue).decimal} TND</Text>
                  </Text>
                </View>
                <View style={styles.cardItem}>
                  <View style={styles.cartCircle}>
                    <Image
                      source={require("../../assets/images/shopping-cart.png")}
                      style={{ width: 24, height: 24 }}
                    />
                  </View>
                  <Text style={[styles.cardValue, { color: "#fff", fontSize: 20 }]}>
                    {dashboardData.thisMonth.totalSales}
                  </Text>
                </View>
              </View>
            </View>

            {/* Total Card */}
            <View style={[styles.card, styles.halfWidthCard, { backgroundColor: "#E67E22" }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: "#fff" }]}>Totale</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardItem}>
                  <View style={styles.currencyCircle}>
                    <Image source={require("../../assets/images/dollar.png")} style={{ width: 25, height: 25 }} />
                  </View>
                  <Text style={{ color: "#fff", flexDirection: "row", fontWeight: "bold" }}>
                    <Text style={{ fontSize: 20 }}>{formatCurrency(dashboardData.total.revenue).whole}</Text>
                    <Text style={{ fontSize: 12 }}>.{formatCurrency(dashboardData.total.revenue).decimal} TND</Text>
                  </Text>
                </View>
                <View style={styles.cardItem}>
                  <View style={styles.cartCircle}>
                    <Image
                      source={require("../../assets/images/shopping-cart.png")}
                      style={{ width: 26, height: 26, marginRight: 8 }}
                    />
                  </View>
                  <Text style={[styles.cardValue, { color: "#fff", fontSize: 20 }]}>
                    {dashboardData.total.totalSales}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
        {/* Business Metrics Section */}
        <View style={styles.cardsContainer}>
          <Text style={styles.sectionTitle}>Indicateurs commerciaux</Text>

          {/* Stock Value Card */}
          <TouchableOpacity
            style={[styles.card, { backgroundColor: "#FF9500", marginBottom: 16 }]}
            onPress={fetchStockCategories}
          >
            <View style={styles.businessCardHeader}>
              <Text style={[styles.cardTitle, { color: "#fff" }]}>Valeur du stock</Text>
            </View>
            <View style={styles.businessCardContent}>
              <View style={styles.cardItem}>
                <View style={styles.currencyCircle}>
                  <Image source={require("../../assets/images/dollar.png")} style={{ width: 25, height: 25 }} />
                </View>
                <Text style={{ color: "#fff", flexDirection: "row", fontWeight: "bold" }}>
                  <Text style={{ fontSize: 24 }}>{formatCurrency(dashboardData.stockValue).whole}</Text>
                  <Text style={{ fontSize: 18 }}>.{formatCurrency(dashboardData.stockValue).decimal} TND</Text>
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Revenue Card */}
          <View style={[styles.card, { backgroundColor: "#4A6FFF", marginBottom: 16 }]}>
            <View style={styles.businessCardHeader}>
              <Text style={[styles.cardTitle, { color: "#fff" }]}>Revenue</Text>
            </View>
            <View style={styles.businessCardContent}>
              <View style={styles.cardItem}>
                <View style={styles.currencyCircle}>
                  <Image source={require("../../assets/images/dollar.png")} style={{ width: 25, height: 25 }} />
                </View>
                <Text style={{ color: "#fff", flexDirection: "row", fontWeight: "bold" }}>
                  <Text style={{ fontSize: 24 }}>{formatCurrency(dashboardData.revenue).whole}</Text>
                  <Text style={{ fontSize: 18 }}>.{formatCurrency(dashboardData.revenue).decimal} TND</Text>
                </Text>
              </View>
            </View>
          </View>

          {/* Profit Card */}
          <View style={[styles.card, { backgroundColor: "#4CD964", marginBottom: 16 }]}>
            <View style={styles.businessCardHeader}>
              <Text style={[styles.cardTitle, { color: "#fff" }]}>Profit</Text>
            </View>
            <View style={styles.businessCardContent}>
              <View style={styles.cardItem}>
                <View style={styles.currencyCircle}>
                  <Image source={require("../../assets/images/dollar.png")} style={{ width: 25, height: 25 }} />
                </View>
                <Text style={{ color: "#fff", flexDirection: "row", fontWeight: "bold" }}>
                  <Text style={{ fontSize: 24 }}>{formatCurrency(dashboardData.profit).whole}</Text>
                  <Text style={{ fontSize: 18 }}>.{formatCurrency(dashboardData.profit).decimal} TND</Text>
                </Text>
              </View>
            </View>
          </View>

          {/* Profit Division Section */}
          {currentProfitDivision && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}> Répartition du profit</Text>
                <TouchableOpacity onPress={() => router.push("/settings")}>
                  <Icon name="settings" size={18} color="#007AFF" />
                </TouchableOpacity>
              </View>

              {/* Month/Year Picker for Profit Division */}
              <View style={styles.calendarHeader}>
                <TouchableOpacity style={styles.calendarNavButton} onPress={() => profifDivisionNavigateMonth("prev")}>
                  <Icon name="chevron-left" size={20} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.calendarMonth}>
                  {getMonthName(currentDateProfitDivision)} {currentDateProfitDivision.getFullYear()}
                </Text>
                <TouchableOpacity style={styles.calendarNavButton} onPress={() => profifDivisionNavigateMonth("next")}>
                  <Icon name="chevron-right" size={20} color="#007AFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.profitDivisionContainer}>
                <View style={styles.profitDivisionItem}>
                  <View style={styles.profitDivisionHeader}>
                    <Icon name="trending-up" size={18} color="#FFD700" />
                    <Text style={styles.profitDivisionTitle}>Investissement</Text>
                  </View>
                  <Text style={styles.profitDivisionPercentage}>
                    {currentProfitDivision.settings.investment_percentage}%
                  </Text>
                  <Text style={styles.profitDivisionAmount}>
                    {currentProfitDivision.amounts.investment} DT
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.profitDivisionItem}>
                  <View style={styles.profitDivisionHeader}>
                    <Icon name="users" size={18} color="#FF9500" />
                    <Text style={styles.profitDivisionTitle}>Associés</Text>
                  </View>
                  <Text style={styles.profitDivisionPercentage}>
                    {currentProfitDivision.settings.partner_percentage}%
                  </Text>
                  <Text style={styles.profitDivisionAmount}>{currentProfitDivision.amounts.partner} DT</Text>
                </View>
              </View>

              <View style={styles.percentageBar}>
                <View
                  style={[
                    styles.percentageFill,
                    {
                      width: `${currentProfitDivision.settings.investment_percentage}%`,
                      backgroundColor: "#FFD700",
                    },
                  ]}
                />
                <View
                  style={[
                    styles.percentageFill,
                    {
                      width: `${currentProfitDivision.settings.partner_percentage}%`,
                      backgroundColor: "#FF9500",
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* Caisse Section */}
        {dashboardData.caisse && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Caisse (Flux de trésorerie)</Text>
            <View style={styles.caisseContainer}>
              <View style={styles.caisseItem}>
                <Text style={styles.caisseLabel}>Revenu :</Text>
                <Text style={styles.caisseValue}>
                  {formatCurrency(dashboardData.caisse.revenue).whole}.
                  {formatCurrency(dashboardData.caisse.revenue).decimal} TND
                </Text>
              </View>
              <View style={styles.caisseItem}>
                <Text style={styles.caisseLabel}>Dépense :</Text>
                <Text style={styles.caisseValue}>
                  {formatCurrency(dashboardData.caisse.expense).whole}.
                  {formatCurrency(dashboardData.caisse.expense).decimal} TND
                </Text>
              </View>
              <View style={styles.caisseItem}>
                <Text style={styles.caisseLabel}>Solde :</Text>
                <Text
                  style={[
                    styles.caisseValue,
                    dashboardData.caisse.balance >= 0 ? styles.caissePositive : styles.caisseNegative,
                  ]}
                >
                  {formatCurrency(dashboardData.caisse.balance).whole}.
                  {formatCurrency(dashboardData.caisse.balance).decimal} TND
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Last 4 Transactions Section */}
        {dashboardData.lastTransactions && dashboardData.lastTransactions.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>4 dernières transactions</Text>
            <View style={styles.transactionsContainer}>
              {dashboardData.lastTransactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionItem}>
                  <View style={styles.transactionIcon}>
                    <Icon
                      name={transaction.type === "revenue" ? "arrow-up-right" : "arrow-down-left"}
                      size={20}
                      color={transaction.type === "revenue" ? "#4CD964" : "#FF3B30"}
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDescription}>{transaction.description}</Text>
                    <Text style={styles.transactionDate}>
                      {new Date(transaction.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} ({new Date(transaction.date).getHours().toString().padStart(2, '0')}:
                      {new Date(transaction.date).getMinutes().toString().padStart(2, '0')})
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      transaction.type === "revenue" ? styles.caissePositive : styles.caisseNegative,
                    ]}
                  >
                    {transaction.type === "revenue" ? "+" : "-"} {formatCurrency(transaction.amount).whole}.
                    {formatCurrency(transaction.amount).decimal} TND
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Monthly Revenue Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Revenu mensuel (12 derniers mois)</Text>
          <BarChart
            data={dashboardData.monthlyRevenueChart}
            width={Dimensions.get("window").width - 55}
            height={220}
            yAxisLabel=""
            yAxisSuffix=" DT"
            chartConfig={{
              backgroundColor: "#ffffff",
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#ffffff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(106, 61, 232, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(128, 128, 128, ${opacity})`,
              barPercentage: 0.7,
              propsForBackgroundLines: {
                strokeDasharray: "",
                stroke: "#EEEEEE",
                strokeWidth: 1,
              },
              propsForLabels: {
                fontSize: 10,
                fontWeight: "bold",
              },
              propsForVerticalLabels: {
                fontSize: 10,
                fontWeight: "bold",
              },
              propsForHorizontalLabels: {
                fontSize: 10,
                fontWeight: "bold",
              },
            }}
            style={styles.chart}
            fromZero={true}
            showBarTops={true}
            segments={5}
          />

          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: "#6A3DE8" }]} />
              <Text style={styles.legendText}>Revenu mensuel</Text>
            </View>
          </View>
        </View>

        {/* Dynamic Daily Revenue Calendar */}
        <View style={styles.chartContainer} ref={chartRef}>
          <Text style={styles.chartTitle}>Calendrier des revenus quotidiens</Text>

          {/* Calendar Header */}
          <View style={styles.calendarHeader}>
            <TouchableOpacity style={styles.calendarNavButton} onPress={() => navigateMonth("prev")}>
              <Icon name="chevron-left" size={20} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.calendarMonth}>
              {getMonthName(currentDate)} {currentDate.getFullYear()}
            </Text>
            <TouchableOpacity style={styles.calendarNavButton} onPress={() => navigateMonth("next")}>
              <Icon name="chevron-right" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {/* Calendar Days Header */}
          <View style={styles.calendarDaysHeader}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <Text key={day} style={styles.calendarDayHeader}>
                {day}
              </Text>
            ))}
          </View>

          {/* Dynamic Calendar Grid */}
          <View style={styles.calendarGrid}>{renderCalendarDays()}</View>

          {/* Selected Date Info */}
          {selectedDate && selectedDayStats && selectedMonthStats && selectedYearStats ? (
            <View style={styles.selectedDateInfo}>
              <Text style={styles.selectedDateText}>
                Selected Date:{" "}
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>

              <View style={styles.statsGroup}>
                <Text style={styles.statsGroupTitle}>Statistiques quotidiennes</Text>
                <Text style={styles.selectedDateRevenue}>Revenu : {selectedDayStats.revenue} DT</Text>
                <Text style={styles.selectedDateRevenue}>Profit : {selectedDayStats.profit} DT</Text>
                <Text style={styles.selectedDateRevenue}>Ventes : {selectedDayStats.totalSales}</Text>
              </View>

              <View style={styles.statsGroup}>
                <Text style={styles.statsGroupTitle}>Statistiques mensuelles ({getMonthName(selectedDate)})</Text>
                <Text style={styles.selectedDateRevenue}>Revenu : {selectedMonthStats.revenue} DT</Text>
                <Text style={styles.selectedDateRevenue}>Profit : {selectedMonthStats.profit} DT</Text>
                <Text style={styles.selectedDateRevenue}>Ventes : {selectedMonthStats.totalSales}</Text>
              </View>

              <View style={styles.statsGroup}>
                <Text style={styles.statsGroupTitle}>Statistiques annuelles ({selectedDate.getFullYear()})</Text>
                <Text style={styles.selectedDateRevenue}>Revenu : {selectedYearStats.revenue} DT</Text>
                <Text style={styles.selectedDateRevenue}>Profit : {selectedYearStats.profit} DT</Text>
                <Text style={styles.selectedDateRevenue}>Ventes : {selectedYearStats.totalSales}</Text>
              </View>

            </View>
          ) : (
            <View>

            </View>
          )}
        </View>

        {/* Bottom padding */}
        <View style={{ height: 80 }} />

        {/* Stock Details Modal */}
        <StockModal
          isVisible={isStockModalVisible}
          onClose={() => setIsStockModalVisible(false)}
          stockData={stockCategoriesData}
          formatCurrency={formatCurrency}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EFF3F6",
  },
  container: {
    flex: 1,
    backgroundColor: "#EFF3F6",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EFF3F6",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    color: "#888",
    marginTop: 4,
  },
  cardsContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  halfWidthCard: {
    width: "48%",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  todayCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardContent: {
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  currencyCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  cartCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  cardValue: {
    fontWeight: "bold",
  },
  chartContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    marginLeft: -17,
  },
  chartLegend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: "#666",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    marginTop: 8,
  },
  businessCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  businessCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  profitDivisionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  profitDivisionItem: {
    flex: 1,
    alignItems: "center",
  },
  profitDivisionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  profitDivisionTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 6,
  },
  profitDivisionPercentage: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  profitDivisionAmount: {
    fontSize: 14,
    color: "#666",
  },
  divider: {
    width: 1,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 8,
  },
  percentageBar: {
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    flexDirection: "row",
    overflow: "hidden",
  },
  percentageFill: {
    height: "100%",
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  calendarNavButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
  },
  calendarMonth: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  calendarDaysHeader: {
    flexDirection: "row",
    marginBottom: 8,
  },
  calendarDayHeader: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    padding: 4,
    borderWidth: 0.5,
    borderColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  calendarDayEmpty: {
    backgroundColor: "#f9f9f9",
  },
  calendarDayToday: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  calendarDaySelected: {
    backgroundColor: "#FFD700",
    borderColor: "#FFD700",
    borderWidth: 2,
  },
  calendarDayNumber: {
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  calendarDayNumberSelected: {
    color: "#333",
    fontWeight: "bold",
  },
  calendarDayRevenue: {
    fontSize: 9,
    color: "#666",
    textAlign: "center",
    fontWeight: "500",
  },
  calendarDayRevenueSelected: {
    color: "#333",
    fontWeight: "bold",
  },
  selectedDateInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  selectedDateText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  selectedDateRevenue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
  },
  selectedMonthRevenue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "red", // or "#FF0000"
  },
  revenueLegend: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  legendItemRevenue: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  legendColorRevenue: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  legendTextRevenue: {
    fontSize: 11,
    color: "#666",
  },
  pickerContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  picker: {
    flex: 1,
    height: 40,
  },
  statsGroup: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  statsGroupTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#555",
    marginBottom: 4,
  },
  caisseContainer: {
    paddingVertical: 8,
  },
  caisseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  caisseLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  caisseValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  caissePositive: {
    color: "#4CD964", // Green
  },
  caisseNegative: {
    color: "#FF3B30", // Red
  },
  transactionsContainer: {
    paddingVertical: 8,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  transactionIcon: {
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  transactionDate: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: "bold",
  },
})

export default HomePageScreen