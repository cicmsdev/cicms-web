"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { resetUserPassword } from "../../services/password/password.api";
import { useRouter } from "next/navigation";

// ✅ Zod validation schema
const resetPasswordSchema = z
  .object({
    old_password: z.string().min(8, "Existing password must be at least 8 characters"),
    new_password: z.string().min(8, "New password must be at least 8 characters"),
    confirm_new_password: z.string().min(8, "Confirm your password"),
  })
  .refine((data) => data.new_password === data.confirm_new_password, {
    message: "Passwords do not match",
    path: ["confirm_new_password"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // ✅ Connect API with react-query mutation
  const resetMutation = useMutation({
    mutationFn: (data: ResetPasswordFormData) => {
      const email = localStorage.getItem("auth_email") || "";
      return resetUserPassword({ email, ...data });
    },
    onSuccess: () => {
      router.push("/login");
    },
    onError: (error: any) => {
      setErrorMessage(error.message || "Password reset failed. Try again.");
    },
  });

  const onSubmit = (data: ResetPasswordFormData) => {
    setErrorMessage("");
    resetMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Section */}
      <div className="hidden md:flex md:w-1/2 bg-[#0a2045] flex-col justify-center items-center text-white p-6 lg:p-10">
        <div className="flex flex-col items-center gap-4 lg:gap-6">
          <div className="flex justify-center mb-4 lg:mb-6">
            <div className="w-50 h-50 lg:w-24 lg:h-24 relative">
              <Image src="/logo.png" alt="I-CLAIMS Logo" fill className="object-contain" />
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
          {/* Mobile Logo */}
          <div className="flex justify-center mb-4 md:hidden">
            <div className="w-16 h-16 relative">
              <Image src="/logo.png" alt="I-CLAIMS Logo" fill className="object-contain" />
            </div>
          </div>

          <div className="text-center mb-4 md:hidden">
            <h1 className="text-lg font-semibold text-[#0a2045] mb-2">CONSTRUCTION-CLAIMS</h1>
            <p className="text-sm text-gray-500">Manage insurance claims from anywhere and anytime.</p>
          </div>

          <h2 className="text-center text-lg lg:text-xl font-semibold">RESET PASSWORD</h2>
          <p className="text-center text-gray-500 mb-6 text-sm lg:text-base">
            Enter your existing and new password below
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Old Password */}
            <div className="relative">
              <label className="block text-sm font-medium mb-1 text-gray-900">Existing Password</label>
              <Input
                type={showOldPassword ? "text" : "password"}
                placeholder="Enter your existing password"
                className="h-10 sm:h-12 text-sm sm:text-base px-3 sm:px-4 text-gray-900 w-full pr-10"
                {...register("old_password")}
              />
              <button
                type="button"
                className="absolute right-3 top-9 text-gray-500"
                onClick={() => setShowOldPassword(!showOldPassword)}
              >
                {showOldPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {errors.old_password && <p className="text-red-500 text-xs sm:text-sm">{errors.old_password.message}</p>}
            </div>

            {/* New Password */}
            <div className="relative">
              <label className="block text-sm font-medium mb-1 text-gray-900">New Password</label>
              <Input
                type={showNewPassword ? "text" : "password"}
                placeholder="New Password"
                className="h-10 sm:h-12 text-sm sm:text-base px-3 sm:px-4 text-gray-900 w-full pr-10"
                {...register("new_password")}
              />
              <button
                type="button"
                className="absolute right-3 top-9 text-gray-500"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {errors.new_password && <p className="text-red-500 text-xs sm:text-sm">{errors.new_password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <label className="block text-sm font-medium mb-1 text-gray-900">Confirm Password</label>
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                className="h-10 sm:h-12 text-sm sm:text-base px-3 sm:px-4 text-gray-900 w-full pr-10"
                {...register("confirm_new_password")}
              />
              <button
                type="button"
                className="absolute right-3 top-9 text-gray-500"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {errors.confirm_new_password && (
                <p className="text-red-500 text-xs sm:text-sm">{errors.confirm_new_password.message}</p>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-center mt-4">
              <Button
                type="submit"
                disabled={resetMutation.isPending}
                className="w-full bg-[#0a2045] hover:bg-[#142c63] text-white h-10 sm:h-12 text-sm sm:text-base"
                label={resetMutation.isPending ? "Resetting..." : "RESET PASSWORD"}
              >
                {resetMutation.isPending ? "Resetting..." : "RESET PASSWORD"}
              </Button>
            </div>
          </form>

          {errorMessage && <p className="text-red-600 text-center mt-4">{errorMessage}</p>}

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
