import { InputHTMLAttributes } from "react";
import { LucideIcon } from "lucide-react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
}

export default function Input({className="", icon: Icon, ...props }: InputProps) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />}
      <input
        className={`w-full pl-10 pr-4 py-2 border border-gray-400 rounded-md focus:outline-none bg-gray-200 ${className}`}
        {...props}
      />
    </div>
  );
}
