"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import { verifyOtp, resendOtp } from "../../services/auth/auth.api";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { jwtDecode } from "jwt-decode";

// ✅ Zod validation schema
const otpSchema = z.object({
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^[0-9]+$/, "OTP must only contain numbers"),
});

type OtpFormData = z.infer<typeof otpSchema>;

// ✅ JWT Payload type
type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
};

export default function OtpPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
  });

  // Mutation for verifying OTP
  const verifyOtpMutation = useMutation({
    mutationFn: ({ email, otp }: { email: string; otp: string }) =>
      verifyOtp(email, otp),
    onSuccess: (data) => {
      const { access_token } = data;
      login(access_token);

      const decoded: JwtPayload = jwtDecode(access_token);

      if (decoded.role === "Claim Manager") {
        router.push("/adminDash");
      } else if (decoded.role === "Contractor") {
        router.push("/contractorDash");
      } else if (decoded.role === "Insurance Representative") {
        router.push("/insuranseRepDash");
      }else if (decoded.role === "Evaluator"){
        router.push("/evaluatorDashboard");
      }
    },
    onError: () => {
      setMessage("Invalid or expired OTP.");
    },
    onSettled: () => setLoading(false),
  });

  const resendOtpMutation = useMutation({
    mutationFn: (email: string) => resendOtp(email),
    onSuccess: () => {
      setMessage("OTP resent successfully. Please check your inbox.");
    },
    onError: () => {
      setMessage("Failed to resend OTP. Try again later.");
    },
  });

  // Handle OTP submit
  const onSubmit = async (formData: OtpFormData) => {
    setMessage("");
    setLoading(true);

    const email = localStorage.getItem("auth_email");
    if (!email) {
      setMessage("No email found. Please login again.");
      router.push("/login");
      return;
    }

    verifyOtpMutation.mutate({ email, otp: formData.otp });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Section */}
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

          <h1 className="text-xl lg:text-2xl font-semibold">
            CONSTRUCTION-CLAIMS
          </h1>
          <p className="text-center max-w-xs text-gray-300 text-sm lg:text-base">
            Manage insurance claims from anywhere and anytime.
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex-1 md:w-1/2 bg-white flex justify-center items-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-md border rounded-2xl shadow-md p-6 lg:p-8">
          {/* Logo - Mobile */}
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

          {/* Mobile header */}
          <div className="text-center mb-4 md:hidden">
            <h1 className="text-lg font-semibold text-[#0a2045] mb-2">
              CONSTRUCTION-CLAIMS
            </h1>
            <p className="text-sm text-gray-500">
              Manage insurance claims from anywhere and anytime.
            </p>
          </div>

          <h2 className="text-center text-[#0a2045] text-lg lg:text-xl font-semibold">
            OTP VERIFICATION
          </h2>
          <p className="text-center text-gray-500 mb-6 text-sm lg:text-base">
            Enter the 6-digit code sent to your phone or email
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">
                OTP Code
              </label>
              <Input
                type="text"
                maxLength={6}
                placeholder="Enter 6-digit OTP"
                className="h-10 sm:h-12 text-center tracking-widest text-lg font-semibold sm:text-xl px-3 sm:px-4 text-gray-900 w-full"
                {...register("otp")}
              />
              {errors.otp && (
                <p className="text-red-500 text-xs sm:text-sm">
                  {errors.otp.message}
                </p>
              )}
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Didn’t receive code?</span>
              <button
                type="button"
                onClick={() => {
                  const email = localStorage.getItem("auth_email");
                  if (email) {
                    resendOtpMutation.mutate(email);
                  } else {
                    setMessage("No email found. Please login again.");
                    router.push("/login");
                  }
                }}
                className="text-[#0a2045] hover:underline"
                disabled={resendOtpMutation.isPending}
              >
                {resendOtpMutation.isPending ? "Resending..." : "Resend OTP"}
              </button>
            </div>

            <div className="flex justify-center mt-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-2/4 bg-[#0a2045] hover:bg-[#142c63] text-white h-10 sm:h-12 text-sm sm:text-base flex justify-center items-center"
                label={loading ? "Verifying..." : "VERIFY OTP"}
              />
            </div>
          </form>

          {message && (
            <p className="text-center text-red-500 text-sm mt-4">{message}</p>
          )}

          <p className="text-center text-xs sm:text-sm text-gray-500 mt-6">
            Back to{" "}
            <Link href="/login" className="text-[#0a2045] font-medium">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
