import { Tabs } from "expo-router"
import { StyleSheet, Text, View, TouchableOpacity } from "react-native"
import { Feather } from "@expo/vector-icons"

// Custom tab bar component
function CustomTabBar({ state, descriptors, navigation }) {
  return (



    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key]
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name

        const isFocused = state.index === index

        // Determine icon based on route name
        let iconName
        if (route.name === "sales") {
          iconName = "shopping-bag"
        } else if (route.name === "stock") {
          iconName = "package"
        } else if (route.name === "index") {
          iconName = "home"
        } else if (route.name === "credit") {
          iconName = "credit-card"
        } else if (route.name === "caisse") {
          iconName = "dollar-sign"
        } else if (route.name === "settings") {
          iconName = "settings"
        }

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          })

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name)
          }
        }

        // Special styling for the center tab (home)
        // if (route.name === "index") {
        //   return (
        //     <TouchableOpacity key={index} onPress={onPress} style={styles.centerTab} activeOpacity={0.7}>
        //       <View style={styles.centerTabButton}>
        //         <Feather name={iconName} size={24} color="#FFFFFF" />
        //       </View>
        //       <Text style={[styles.tabLabel, { color: isFocused ? "#007AFF" : "#8E8E93" }]}>{label}</Text>
        //     </TouchableOpacity>
        //   )
        // }

        return (
          <TouchableOpacity key={index} onPress={onPress} style={styles.tab} activeOpacity={0.7}>
            <Feather name={iconName} size={22} color={isFocused ? "#007AFF" : "#8E8E93"} />
            <Text style={[styles.tabLabel, { color: isFocused ? "#007AFF" : "#8E8E93" }]}>{label}</Text>
            {isFocused && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: "Sales",
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: "Stock",
        }}
      />

      <Tabs.Screen
        name="caisse"
        options={{
          title: "Caisse",
        }}
      />
      <Tabs.Screen
        name="credit"
        options={{
          title: "Credit",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    height: 70,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
  },
  tab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    position: "relative",
  },
  centerTab: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 8,
  },
  centerTabButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    width: 30,
    height: 3,
    backgroundColor: "#007AFF",
    borderRadius: 1.5,
  },
})
