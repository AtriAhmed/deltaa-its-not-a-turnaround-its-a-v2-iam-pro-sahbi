import React from "react"
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native"
import Icon from "react-native-vector-icons/Feather"

interface StockCategory {
  category: string
  quantity: number
  value: number
}

interface StockModalProps {
  isVisible: boolean
  onClose: () => void
  stockData: StockCategory[]
  formatCurrency: (value: number | string) => { whole: string; decimal: string }
}

const StockModal: React.FC<StockModalProps> = ({ isVisible, onClose, stockData, formatCurrency }) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <View style={modalStyles.modalHeader}>
            <Text style={modalStyles.modalTitle}>Stock Details by Category</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
              <Icon name="x" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={modalStyles.scrollView}>
            {stockData.length > 0 ? (
              stockData.map((item, index) => (
                <View key={index} style={modalStyles.categoryItem}>
                  <Text style={modalStyles.categoryName}>{item.category}</Text>
                  <View style={modalStyles.categoryDetails}>
                    <Text style={modalStyles.categoryQuantity}>Quantity: {item.quantity}</Text>
                    <Text style={modalStyles.categoryValue}>
                      Value:{" "}
                      <Text style={{ fontWeight: "bold" }}>
                        {formatCurrency(item.value).whole}.{formatCurrency(item.value).decimal} TND
                      </Text>
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={modalStyles.noDataText}>No stock data available for categories.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: "90%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  scrollView: {
    width: "100%",
  },
  categoryItem: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
    color: "#333",
  },
  categoryDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryQuantity: {
    fontSize: 14,
    color: "#666",
  },
  categoryValue: {
    fontSize: 14,
    color: "#666",
  },
  noDataText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginTop: 20,
  },
})

export default StockModal
