"use client";

import { Stack, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { getBaseUrl } from "@/utils/api";
import { useLayoutEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from "react-native";
import Icon from "react-native-vector-icons/Feather";
import axios from "axios";
import { useProtectedRoute } from "../../../../../hooks/useProtectedRoute";
import { SafeAreaView } from "react-native-safe-area-context";

// Client type definition
interface Client {
  name: string;
  telephone: string;
  address: string;
  email: string;
  city: string;
}

const AddClientScreen = () => {
  useProtectedRoute();

  // State for form fields
  const [name, setName] = useState("");
  const [telephone, setTelephone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");

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
    // Basic validation - can be enhanced based on your requirements
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

    // Valider le nom
    if (!name.trim()) {
      newErrors.name = "Le nom est requis";
      isValid = false;
    }

    if (!telephone.trim()) {
      newErrors.telephone = "Le téléphone est requis";
      isValid = false;
    } else if (!isValidTelephone(telephone)) {
      newErrors.telephone = "Veuillez saisir un numéro de téléphone valide";
      isValid = false;
    }

    // Valider l'email
    if (email.trim() && !isValidEmail(email)) {
      newErrors.email = "Veuillez saisir une adresse e-mail valide";
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

    // Créer l'objet client
    const client: Client = {
      name: name.trim(),
      telephone: telephone.trim(),
      address: address.trim(),
      email: email.trim(),
      city: city.trim(),
    };

    try {
      const res = await axios.post(`${getBaseUrl()}/api/clients`, client);
      router.push("/settings/clients");
    } catch (error) {
      console.error("Échec du chargement des clients :", error);
    }

    // Retour à l'écran client avec confirmation
    Alert.alert("Client ajouté", "Le client a été ajouté avec succès.", [
      {
        text: "OK",
        onPress: () => router.push("/settings/clients"),
      },
    ]);
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
          <Text style={styles.title}>{"Ajouter un client"}</Text>
          <TouchableOpacity style={styles.saveButton} onPress={saveClient}>
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              Nom <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.name ? styles.inputError : null]}
              value={name}
              onChangeText={setName}
              placeholder="Entrez le nom du client"
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              Téléphone <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.telephone ? styles.inputError : null]}
              value={telephone}
              onChangeText={setTelephone}
              placeholder="Entrez le numéro de téléphone"
              keyboardType="phone-pad"
            />
            {errors.telephone ? <Text style={styles.errorText}>{errors.telephone}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              value={email}
              onChangeText={setEmail}
              placeholder="Entrez l'adresse email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Adresse</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={address}
              onChangeText={setAddress}
              placeholder="Entrez l'adresse"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Ville</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="Entrez la ville"
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
