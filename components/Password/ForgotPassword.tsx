// components/forgot-password/page.tsx

"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Link from "next/link";
import { useState } from "react";
import Image from "next/image";

// ✅ Zod validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    console.log("Forgot Password Request ✅", data);

    // simulate API call
    await new Promise((res) => setTimeout(res, 1500));

    setLoading(false);
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

          <h1 className="text-xl lg:text-2xl font-semibold">CONSTRUCTION-CLAIMS</h1>
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

          <div className="text-center mb-4 md:hidden">
            <h1 className="text-lg font-semibold text-[#0a2045] mb-2">
              CONSTRUCTION-CLAIMS
            </h1>
            <p className="text-sm text-gray-500">
              Manage insurance claims from anywhere and anytime.
            </p>
          </div>

          <h2 className="text-center text-lg lg:text-xl font-semibold">FORGOT PASSWORD</h2>
          <p className="text-center text-gray-500 mb-6 text-sm lg:text-base">
            Enter your email to receive a password reset link
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">
                Email
              </label>
              <Input
                type="email"
                placeholder="Enter your email"
                className="h-10 sm:h-12 text-sm sm:text-base px-3 sm:px-4 text-gray-900 w-full"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-red-500 text-xs sm:text-sm">{errors.email.message}</p>
              )}
            </div>

            <div className="flex justify-center mt-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0a2045] hover:bg-[#142c63] text-white h-10 sm:h-12 text-sm sm:text-base"
                label={loading ? "Sending..." : "SEND RESET EMAIL"}
              >
                {loading ? "Sending..." : "SEND RESET EMAIL"}
              </Button>
            </div>
          </form>

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
