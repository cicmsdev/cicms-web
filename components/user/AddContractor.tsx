"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContractor } from "../../services/user/user.api";
import toast from "react-hot-toast";

// ✅ Zod validation schema
const signupSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"), 
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^\+?\d{10,}$/, "Phone must be digits (optionally starts with +)"),
  email: z.string().email("Invalid email"),
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const createContractorMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      email: string;
      phoneNumber: string;
    }) => createContractor(payload),
  });

  const onSubmit = async (data: SignupFormData) => {
    console.log("SUBMIT DATA:", data);
    setErrorMessage("");
    setLoading(true);

    const payload = {
      name: `${data.firstName} ${data.lastName}`.trim(),
      email: data.email,
      phoneNumber: data.phone,
    };

    // Save for OTP page if needed
    localStorage.setItem("auth_email", data.email);

    try {
      await toast.promise(createContractorMutation.mutateAsync(payload), {
        loading: "Creating account...",
        success: (res: any) => res?.message ?? "Account created successfully.",
        error: (err: any) => err?.message ?? "Failed to create account.",
      });
      reset();
      router.push("/login");
    } catch (err: any) {
      setErrorMessage(err?.message ?? "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Section */}
      <div className="hidden md:flex md:w-1/2 bg-[#0a2045] flex-col justify-center items-center text-white p-6 lg:p-10">
        <div className="flex flex-col items-center gap-4 lg:gap-6">
          <div className="flex justify-center mb-4 lg:mb-6">
            <div className="w-20 h-20 lg:w-32 lg:h-32 relative">
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
        <div className="w-full max-w-2xl border rounded-2xl shadow-md p-6 lg:p-8">
          {/* Mobile branding */}
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

          {/* Desktop logo */}
          <div className="hidden md:flex justify-center mb-3">
            <div className="w-50 h-50 lg:w-24 lg:h-20 relative">
              <Image
                src="/logo.png"
                alt="I-CLAIMS Logo"
                fill
                className="object-contain"
              />
            </div>
          </div>

          <h2 className="text-center text-lg lg:text-xl font-semibold">
            SIGNUP
          </h2>
          <p className="text-center text-gray-500 mb-6 text-sm lg:text-base">
            Fill the form to create a new account
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
              <div>
                <label className="block text-sm text-gray-900 font-medium mb-1">
                  First Name
                </label>
                <Input
                  className="h-10 sm:h-12 text-sm sm:text-base justify-start px-3 sm:px-4 text-gray-900 text-left w-full"
                  placeholder="First name"
                  {...register("firstName")}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-xs sm:text-sm">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">
                  Last Name
                </label>
                <Input
                  className="h-10 sm:h-12 text-sm sm:text-base px-3 sm:px-4 text-gray-900 w-full"
                  placeholder="Last name"
                  {...register("lastName")}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-xs sm:text-sm">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
              <div>
                <label className="w-full text-sm text-gray font-medium mb-1 text-gray-900">
                  Email
                </label>
                <Input
                  className="h-10 sm:h-12 text-sm sm:text-base px-3 sm:px-4 text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500 w-full"
                  placeholder="Email"
                  type="email"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs sm:text-sm">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">
                  Phone
                </label>
                <Input
                  className="h-10 sm:h-12 text-sm sm:text-base px-3 sm:px-4 text-gray-900 w-full"
                  placeholder="+2507XXXXXXXX"
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="text-red-500 text-xs sm:text-sm">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-center mt-4">
              <Button
                type="submit"
                label={
                  loading || createContractorMutation.isPending
                    ? "Creating..."
                    : "CREATE ACCOUNT"
                }
                disabled={loading || createContractorMutation.isPending}
                className="w-2/4 bg-[#0a2045] hover:bg-[#142c63] text-white h-10 sm:h-12 text-sm sm:text-base flex justify-center items-center"
              />
            </div>
          </form>

          {errorMessage && (
            <p className="text-red-600 text-center mt-4">{errorMessage}</p>
          )}

          <p className="text-center text-xs sm:text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-[#0a2045] font-medium">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
