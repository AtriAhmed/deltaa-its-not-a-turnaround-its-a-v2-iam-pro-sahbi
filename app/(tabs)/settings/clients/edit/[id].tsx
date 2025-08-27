"use client";

import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useLayoutEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from "react-native";
import Icon from "react-native-vector-icons/Feather";
import axios from "axios";
import { useProtectedRoute } from "../../../../../hooks/useProtectedRoute";
import { getBaseUrl } from "@/utils/api";
import { SafeAreaView } from "react-native-safe-area-context";

interface Client {
  id: string;
  name: string;
  telephone: string;
  address: string;
  email: string;
  city: string;
}

const AddClientScreen = ({ route = {} }) => {
  useProtectedRoute();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [client, setClient] = useState<Client>();

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${getBaseUrl()}/api/clients/${id}`);
      setClient(res.data);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);
  const editingClient = route.params?.client;
  const isEditing = !!editingClient;

  // State for form fields
  const [name, setName] = useState(isEditing ? editingClient.name : "");
  const [telephone, setTelephone] = useState(isEditing ? editingClient.telephone : "");
  const [address, setAddress] = useState(isEditing ? editingClient.address : "");
  const [email, setEmail] = useState(isEditing ? editingClient.email : "");
  const [city, setCity] = useState(isEditing ? editingClient.city : "");

  // State for validation errors
  const [errors, setErrors] = useState({
    name: "",
    telephone: "",
    email: "",
    address: "",
    city: "",
  });

  // Function to validate email format
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Function to validate telephone format
  const isValidTelephone = (telephone: string) => {
    const telephoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/;
    return telephoneRegex.test(telephone);
  };

  // Function to validate form
  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      name: "",
      telephone: "",
      email: "",
      address: "",
      city: "",
    };

    // Validate name
    if (!client?.name?.trim()) {
      newErrors.name = "Name is required";
      isValid = false;
    }

    // Validate telephone
    if (!client?.telephone?.trim()) {
      newErrors.telephone = "Telephone is required";
      isValid = false;
    } else if (!isValidTelephone(client.telephone)) {
      newErrors.telephone = "Please enter a valid telephone number";
      isValid = false;
    }

    // Validate email (optional field)
    if (client?.email?.trim() && !isValidEmail(client.email)) {
      newErrors.email = "Please enter a valid email address";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };


  // Function to save client
  const saveClient = async () => {
    if (!validateForm()) {
      return;
    }

    if (!isEditing) {
      const res = await axios.put(`${getBaseUrl()}/api/clients/${id}`, client);
      router.push("/settings/clients");
    }

    // Navigate back to client screen
    // Alert.alert(
    //     "Client Updated",
    //     "Client has been updated successfully." ,
    //     [
    //         {
    //             text: "OK",
    //             onPress: () => navigation.navigate("Client"),
    //         },
    //     ],
    // )
  };

  const handleChange = (field: string, value: string) => {
    setClient((prev) => ({ ...prev, [field]: value }));
  };

  // begin hide tab
  const nav = useNavigation();

  useLayoutEffect(() => {
    nav.getParent()?.setOptions({
      tabBarStyle: { display: "none" },
    });

    return () => {
      nav.getParent()?.setOptions({
        tabBarStyle: { display: "flex" },
      });
    };
  }, [nav]);

  const router = useRouter();
  // end hidetab

  const handleGoBack = () => {
    nav.getParent()?.setOptions({
      tabBarStyle: { display: "flex" },
    });
    router.push("/settings/clients");
  };
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingView}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Icon name="arrow-left" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>{isEditing ? "Edit Client" : "Add Client"}</Text>
          <TouchableOpacity style={styles.saveButton} onPress={saveClient}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              Name <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.name ? styles.inputError : null]}
              value={client?.name || ""}
              onChangeText={(value) => handleChange("name", value)}
              placeholder="Enter client name"
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              Telephone <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.telephone ? styles.inputError : null]}
              value={client && client.telephone}
              onChangeText={(value) => handleChange("telephone", value)}
              placeholder="Enter telephone number"
              keyboardType="phone-pad"
            />
            {errors.telephone ? <Text style={styles.errorText}>{errors.telephone}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              value={client && client.email}
              onChangeText={(value) => handleChange("email", value)}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Address</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={client && client.address}
              onChangeText={(value) => handleChange("address", value)}
              placeholder="Enter address"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>City</Text>
            <TextInput
              style={styles.input}
              value={client && client.city}
              onChangeText={(value) => handleChange("city", value)}
              placeholder="Enter city"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>

  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  saveButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  saveButtonText: {
    color: "#007AFF",
    fontWeight: "600",
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  requiredStar: {
    color: "#FF3B30",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: "#FF3B30",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    marginTop: 4,
  },
});

export default AddClientScreen;
