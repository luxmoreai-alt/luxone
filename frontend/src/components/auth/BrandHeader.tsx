const BrandHeader = () => {
  return (
    <div className="mb-10">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 text-lg font-bold text-white shadow-lg">
          Z
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            ZORA
          </h1>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">
            CRM
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-5xl font-semibold tracking-tight text-slate-900">
          Sign in
        </h2>
        <p className="mt-2 text-xl text-slate-600">to access CRM</p>
      </div>
    </div>
  );
};

export default BrandHeader;