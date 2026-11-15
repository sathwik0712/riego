export const metadata = {
  title: "Sign up - Riego",
  description: "Create your Riego farmer account",
};

// Sign up page placeholder (constrained to ~480px on desktop)
export default function SignupPage() {
  return (
    <div className="w-full max-w-[480px] bg-white rounded-3xl p-6 sm:p-8 border border-[#DCD6C0] shadow-sm flex flex-col items-center text-center gap-3">
      {/* Page title */}
      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B2D21]">
        Sign up
      </h1>

      {/* Helper message in sentence case */}
      <p className="text-base text-[#5F6E62]">
        Signup form coming next
      </p>
    </div>
  );
}
