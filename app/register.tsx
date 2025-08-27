"use client";

import { getBaseUrl } from "@/utils/api";
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Feather";

const RegisterScreen = ({ navigation }) => {
  // State for form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Function to handle registration
  const handleRegister = () => {
    // Basic validation
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name.");
      return;
    }

    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    if (!password) {
      Alert.alert("Error", "Please enter a password.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    // Password strength validation
    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters long.");
      return;
    }

    // Here you would typically call your registration API
    // For now, we'll just navigate to the login screen
    Alert.alert("Success", "Registration successful! Please login.", [
      {
        text: "OK",
        onPress: () => navigation.navigate("Login"),
      },
    ]);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingView}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
              {/* Header with back button */}
              <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                  <Icon name="arrow-left" size={24} color="#007AFF" />
                </TouchableOpacity>
              </View>

              {/* Registration Form */}
              <View style={styles.formContainer}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Please fill in the form to continue</Text>

                {/* Name Input */}
                <View style={styles.inputContainer}>
                  <View style={styles.inputIconContainer}>
                    <Icon name="user" size={20} color="#999" />
                  </View>
                  <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} autoCapitalize="words" />
                </View>

                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <View style={styles.inputIconContainer}>
                    <Icon name="mail" size={20} color="#999" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <View style={styles.inputIconContainer}>
                    <Icon name="lock" size={20} color="#999" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPassword(!showPassword)}>
                    <Icon name={showPassword ? "eye-off" : "eye"} size={20} color="#999" />
                  </TouchableOpacity>
                </View>

                {/* Confirm Password Input */}
                <View style={styles.inputContainer}>
                  <View style={styles.inputIconContainer}>
                    <Icon name="lock" size={20} color="#999" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Icon name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#999" />
                  </TouchableOpacity>
                </View>

                {/* Register Button */}
                <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
                  <Text style={styles.registerButtonText}>Register</Text>
                </TouchableOpacity>

                {/* Login Option */}
                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                    <Text style={styles.loginButtonText}>Login</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    padding: 4,
  },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 16,
    height: 50,
  },
  inputIconContainer: {
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  passwordToggle: {
    paddingHorizontal: 12,
  },
  registerButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  loginText: {
    color: "#666",
    fontSize: 14,
  },
  loginButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default RegisterScreen;

// // File: app/register.tsx
// import React, { useState } from 'react';
// import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
// import axios from 'axios';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useRouter } from 'expo-router';

// export default function Register() {
//   const router = useRouter();
//   const [registerInput, setRegisterInput] = useState({
//     name: '',
//     email: '',
//     password: '',
//     accessId: 1,
//     verify_password: ''
//   });
//   const [errors, setErrors] = useState<{ [key: string]: string }>({});

//   const handleInputChange = (name: string, value: string) => {
//     setRegisterInput({ ...registerInput, [name]: value });
//   };

//   const resetInputs = () => {
//     setRegisterInput({
//       name: '',
//       email: '',
//       password: '',
//       accessId: 1,
//       verify_password: ''
//     });
//   };

//   const handleSubmit = async () => {
//     if (registerInput.password !== registerInput.verify_password) {
//       setErrors({ verify_password: "Passwords do not match" });
//       return;
//     }
//     try {
//       const res = await axios.post(`${getBaseUrl()}/api/register', registerInput);
//       await AsyncStorage.setItem('token', res.data.token);
//       resetInputs();
//         //@ts-ignore
//       router.push('/login');
//     } catch (err) {
//       setErrors({ general: "An error occurred. Please try again." });
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Register</Text>
//       {errors.general && <Text style={styles.error}>{errors.general}</Text>}
//       <TextInput
//         style={styles.input}
//         placeholder="Username"
//         value={registerInput.name}
//         onChangeText={(text) => handleInputChange('name', text)}
//       />
//       {errors.name && <Text style={styles.error}>{errors.name}</Text>}
//       <TextInput
//         style={styles.input}
//         placeholder="Email"
//         value={registerInput.email}
//         onChangeText={(text) => handleInputChange('email', text)}
//         keyboardType="email-address"
//         autoCapitalize="none"
//       />
//       {errors.email && <Text style={styles.error}>{errors.email}</Text>}
//       <TextInput
//         style={styles.input}
//         placeholder="Password"
//         value={registerInput.password}
//         onChangeText={(text) => handleInputChange('password', text)}
//         secureTextEntry
//       />
//       {errors.password && <Text style={styles.error}>{errors.password}</Text>}
//       <TextInput
//         style={styles.input}
//         placeholder="Confirm Password"
//         value={registerInput.verify_password}
//         onChangeText={(text) => handleInputChange('verify_password', text)}
//         secureTextEntry
//       />
//       {errors.verify_password && <Text style={styles.error}>{errors.verify_password}</Text>}
//       <Button title="Register" onPress={handleSubmit} />
//       <View style={styles.switchContainer}>
//         <Text>Already have an account?</Text>
//         {/* @ts-ignore */}
//         <Button title="Login" onPress={() => router.push('/login')} />
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     padding: 16,
//     backgroundColor: '#fff'
//   },
//   title: {
//     fontSize: 24,
//     marginBottom: 16,
//     textAlign: 'center'
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 4,
//     padding: 8,
//     marginBottom: 12
//   },
//   error: {
//     color: 'red',
//     marginBottom: 8
//   },
//   switchContainer: {
//     marginTop: 16,
//     alignItems: 'center'
//   }
// });
