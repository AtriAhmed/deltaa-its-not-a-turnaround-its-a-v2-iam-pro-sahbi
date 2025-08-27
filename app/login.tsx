"use client";

import { useAuthContext } from "../contexts/AuthProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Stack, useRouter } from "expo-router";
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
  Image,
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import { SafeAreaView } from "react-native-safe-area-context";
import { getBaseUrl } from "@/utils/api";

const LoginScreen = ({ navigation }) => {
  const { setUser } = useAuthContext();
  const router = useRouter();
  const [loginInput, setLoginInput] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<string>("");

  const handleInputChange = (name: string, value: string) => {
    setLoginInput({ ...loginInput, [name]: value });
  };

  const handleSubmit = async () => {
    // try {
    console.log(loginInput.email);
    //   const res = await axios.post(`${getBaseUrl()}/api/login`, loginInput);
    //   setUser(res.data.user);
    //   await AsyncStorage.setItem('token', res.data.token);
    //   if (res.data.user.role > 0) {
    //     // @ts-ignore
    //     router.push('/admin');
    //   } else {
    //     router.push('/');
    //   }
    // } catch (err: any) {
    //   if (err.response && err.response.status === 401) {
    //     setErrors(prev => [...prev, 'Email or password incorrect']);
    //   } else {
    //     setErrors(prev => [...prev, 'An error occurred. Please try again.']);
    //   }
    // }
  };

  // State for form fields

  const [showPassword, setShowPassword] = useState(false);

  // Function to handle login
  const handleLogin = async () => {
    if (!loginInput.email.trim()) {
      setErrors("Please enter your email address.");
      return;
    }

    if (!loginInput.password) {
      setErrors("Please enter your password.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginInput.email.trim())) {
      setErrors("Please enter a valid email address.");
      return;
    }

    try {
      const res = await axios.post(`${getBaseUrl()}/api/login`, loginInput);
      setUser(res.data.user);
      await AsyncStorage.setItem("token", res.data.token);
      if (res.data.user.role > 0) {
        // @ts-ignore
        router.push("/admin");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      if (err.response && err.response.status === 401) {
        setErrors("Email or password incorrect");
      } else {
        setErrors("An error occurred. Please try again.");
      }
    }
  };

  const navigateToRegister = () => {
    navigation.navigate("Register");
  };
  const [isInputFocused, setIsInputFocused] = useState(false);
  return (
    <TouchableWithoutFeedback
      onPress={() => !isInputFocused && Keyboard.dismiss()}
    >
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.content}>
            {/* Logo/App Name */}
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Icon name="shopping-bag" size={40} color="#007AFF" />
              </View>
              <Text style={styles.appName}>ProductManager</Text>
            </View>

            {/* Login Form */}
            <View style={styles.formContainer}>
              <Text style={styles.title}>Login</Text>
              <Text style={styles.subtitle}>Please sign in to continue</Text>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputIconContainer}>
                  <Icon name="mail" size={20} color="#999" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={loginInput.email}
                  onChangeText={(text) => handleInputChange("email", text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
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
                  value={loginInput.password}
                  secureTextEntry={!showPassword}
                  onChangeText={(text) => handleInputChange("password", text)}
                  autoCapitalize="none"
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Icon
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>
              </View>
              {errors && <Text style={styles.error}>{errors}</Text>}

              {/* Login Button */}
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
              >
                <Text style={styles.loginButtonText}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    marginTop: -100,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#e6f2ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
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
    outline: "none",
  },
  passwordToggle: {
    paddingHorizontal: 12,
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: "#007AFF",
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  registerText: {
    color: "#666",
    fontSize: 14,
  },
  registerButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
  error: {
    color: "red",
    marginBottom: 8,
  },
});

export default LoginScreen;
