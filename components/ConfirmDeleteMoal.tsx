import { View, Text, Modal, TouchableWithoutFeedback, StyleSheet, TouchableOpacity } from 'react-native'
import React from 'react'
import Icon from "react-native-vector-icons/Feather"

interface ConfirmDeleteModalProps {
    deleteConfirmModal: boolean;
    setDeleteConfirmModal: (value: boolean) => void;
    confirmAction: () => void;
    modalTitle: string;
    modalText: any;
}

const ConfirmDeleteModal = (props: ConfirmDeleteModalProps) => {
    const { 
      deleteConfirmModal, 
      setDeleteConfirmModal, 
      confirmAction ,
      modalTitle,
      modalText
    } = props;

    return (
        <View>
            <Modal
                visible={deleteConfirmModal}
                transparent
                animationType="fade"
                onRequestClose={() => setDeleteConfirmModal(false)}
            >
                <TouchableWithoutFeedback onPress={() => setDeleteConfirmModal(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                            <View style={styles.deleteModal}>
                                <Icon name="alert-triangle" size={40} color="#FF3B30" style={styles.deleteIcon} />
                                <Text style={styles.deleteTitle}>{modalTitle}</Text>
                                <Text style={styles.deleteMessage}>
                                    {modalText}
                                </Text>
                                <View style={styles.deleteActions}>
                                    <TouchableOpacity style={styles.deleteCancelButton} onPress={() => setDeleteConfirmModal(false)}>
                                        <Text style={styles.deleteCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.deleteConfirmButton} onPress={confirmAction}>
                                        <Text style={styles.deleteConfirmText}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

        </View>
    )
}
const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    // Details modal styles
    detailsModal: {
        width: "90%",
        maxHeight: "80%",
        backgroundColor: "#fff",
        borderRadius: 12,
        overflow: "hidden",
    },
    deleteModal: {
        width: "80%",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
        alignItems: "center",
    },
    deleteTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 12,
    },
    deleteMessage: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
        marginBottom: 20,
    },
    deleteActions: {
        flexDirection: "row",
        width: "100%",
    },
    deleteCancelButton: {
        flex: 1,
        paddingVertical: 10,
        marginRight: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#ddd",
        alignItems: "center",
    },
    deleteCancelText: {
        color: "#666",
    },
    deleteConfirmButton: {
        flex: 1,
        paddingVertical: 10,
        marginLeft: 8,
        borderRadius: 8,
        backgroundColor: "#FF3B30",
        alignItems: "center",
    },
    deleteConfirmText: {
        color: "#fff",
        fontWeight: "500",
    },
    deleteIcon: {
        marginBottom: 16,
    },
})


export default ConfirmDeleteModal