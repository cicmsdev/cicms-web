"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Link from "next/link";
import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { login } from "../../services/auth/auth.api";
import { Eye, EyeOff } from "lucide-react"; 
import toast from "react-hot-toast"; 

// ✅ Zod validation schema
const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false); 
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // ✅ Connect API with react-query mutation
  const loginMutation = useMutation({
    mutationFn: (data: LoginFormData) => login(data.email, data.password),
    onSuccess: (data) => {
      const { mustChangePassword, userId, role, message } = data; 

      // Save session data
      localStorage.setItem("auth_email", data.email);
      localStorage.setItem("user_id", userId);

      // Redirect based on server response
      if (mustChangePassword) {
        toast.success("Login successful — please change your password.");
        router.push("/resetPassword");
      } else {
        toast.success(message ?? "OTP sent. Check your email.");
        router.push("/verify-otp");
      }
    },
    onError: (err: any) => {
      const msg =
        err?.message ||
        err?.response?.data?.message ||
        "Invalid credentials, please try again.";
      setErrorMessage(msg); 
      toast.error(msg);     
    },
  });

  const onSubmit = (data: LoginFormData) => {
    setErrorMessage("");
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Section - Hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 bg-[#0a2045] flex-col justify-center items-center text-white p-6 lg:p-10">
        <div className="flex flex-col items-center gap-4 lg:gap-6">
          <div className="flex justify-center mb-4 lg:mb-6">
            <div className="w-50 h-50 lg:w-24 lg:h-24 relative">
              <Image
                src="/logo.png"
                alt="I-CLAIMS Logo"
                fill
                className="object-contain"
              />
            </div>
          </div>
          <h1 className="text-xl lg:text-2xl font-semibold">CONSTRUCTION-CLAIMS</h1>
          <p className="text-center max-w-xs text-gray-300 text-sm lg:text-base">
            Manage insurance claims from anywhere and anytime.
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex-1 md:w-1/2 bg-white flex justify-center items-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-md border rounded-2xl shadow-md p-6 lg:p-8">
          {/* Logo - Mobile only */}
          <div className="flex justify-center mb-4 md:hidden">
            <div className="w-16 h-16 relative">
              <Image
                src="/logo.png"
                alt="I-CLAIMS Logo"
                fill
                className="object-contain"
              />
            </div>
          </div>

          <div className="text-center mb-4 md:hidden">
            <h1 className="text-lg font-semibold text-[#0a2045] mb-2">
              CONSTRUCTION-CLAIMS
            </h1>
            <p className="text-sm text-gray-500">
              Manage insurance claims from anywhere and anytime.
            </p>
          </div>

          <h2 className="text-center text-lg lg:text-xl font-semibold">LOGIN</h2>
          <p className="text-center text-gray-500 mb-6 text-sm lg:text-base">
            Enter your credentials to access your account
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Email</label>
              <Input
                type="email"
                placeholder="Email"
                className="h-10 sm:h-12 text-sm sm:text-base px-3 sm:px-4 text-gray-900 w-full"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-red-500 text-xs sm:text-sm">{errors.email.message}</p>
              )}
            </div>

            {/* Password with show/hide toggle */}
            <div className="relative">
              <label className="block text-sm font-medium mb-1 text-gray-900">Password</label>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="h-10 sm:h-12 text-sm sm:text-base px-3 sm:px-4 text-gray-900 w-full pr-10"
                {...register("password")}
              />
              <button
                type="button"
                className="absolute right-3 top-9  text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {errors.password && (
                <p className="text-red-500 text-xs sm:text-sm">{errors.password.message}</p>
              )}
            </div>

            <div className="flex justify-end text-sm">
              <Link href="/forgot-password" className="text-[#0a2045] hover:underline">
                Forgot password?
              </Link>
            </div>

            <div className="flex justify-center mt-4">
              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-2/4 bg-[#0a2045] hover:bg-[#142c63] text-white h-10 sm:h-12 text-sm sm:text-base flex justify-center items-center"
                label={loginMutation.isPending ? "Logging in..." : "LOGIN"}
              >
                {loginMutation.isPending ? "Logging in..." : "LOGIN"}
              </Button>
            </div>
          </form>

          {errorMessage && (
            <p className="text-red-600 text-center mt-4">{errorMessage}</p>
          )}

          <p className="text-center text-xs sm:text-sm text-gray-500 mt-6">
            Don’t have an account?{" "}
            <Link href="/signup" className="text-[#0a2045] font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
