
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../../components/common/Button.jsx';
import {
  Sparkles,
  AlertCircle,
} from 'lucide-react';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    orgName: '',
    slug: '',
    industry: 'textiles',
    gstin: '',
    ownerName: '',
    email: '',
    password: '',
    phone: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Convert a business name or handle into a valid slug.
  const createSlug = (value) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      // Generate the handle automatically while it hasn't
      // been manually customized by the user.
      if (name === 'orgName' && !prev.slug) {
        next.slug = createSlug(value);
      }

      // Normalize a manually edited business handle.
      if (name === 'slug') {
        next.slug = createSlug(value);
      }

      return next;
    });

    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanSlug = createSlug(formData.slug);

    // Validate the business handle before sending the request.
    if (cleanSlug.length < 2) {
      setError(
        'Business handle must contain at least 2 letters or numbers.'
      );
      return;
    }

    if (!formData.orgName.trim()) {
      setError('Please enter your company name.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    const payload = {
      ...formData,
      orgName: formData.orgName.trim(),
      slug: cleanSlug,
      ownerName: formData.ownerName.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      gstin: formData.gstin.trim().toUpperCase(),
    };

    try {
      setLoading(true);

      await register(payload);

      // Redirect only after registration succeeds.
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const responseMessage =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message;

      const validationDetails =
        err?.response?.data?.error?.details;

      if (Array.isArray(validationDetails) && validationDetails.length) {
        const firstDetail = validationDetails[0];

        setError(
          typeof firstDetail === 'string'
            ? firstDetail
            : firstDetail.message || responseMessage || 'Registration failed.'
        );
      } else {
        setError(responseMessage || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="flex justify-center items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-900/50">
            <Sparkles className="w-6 h-6 text-emerald-100" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white">
            VyaparAI
          </h2>
        </div>

        <p className="mt-2 text-center text-sm text-slate-400">
          Onboard your B2B Manufacturing or Wholesale Business
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Company information */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="orgName"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  Company Name
                </label>

                <input
                  id="orgName"
                  type="text"
                  name="orgName"
                  required
                  value={formData.orgName}
                  onChange={handleChange}
                  placeholder="Surat Silk Mills"
                  autoComplete="organization"
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="slug"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  Business Handle
                </label>

                <input
                  id="slug"
                  type="text"
                  name="slug"
                  required
                  minLength={2}
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="surat-silk-mills"
                  autoComplete="off"
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  title="Use at least 2 characters: lowercase letters, numbers, and hyphens."
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />

                <p className="mt-1 text-xs text-slate-500">
                  Lowercase letters, numbers, and hyphens.
                </p>
              </div>
            </div>

            {/* Industry and GSTIN */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="industry"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  Industry
                </label>

                <select
                  id="industry"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  <option value="textiles">
                    Textiles &amp; Fabrics (Surat)
                  </option>
                  <option value="ceramics">
                    Ceramics &amp; Tiles (Morbi)
                  </option>
                  <option value="hardware">
                    Hardware &amp; Tools (Rajkot)
                  </option>
                  <option value="pharma">
                    Pharmaceutical Distribution
                  </option>
                  <option value="general_b2b">
                    General B2B Wholesale
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="gstin"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  GSTIN (Optional)
                </label>

                <input
                  id="gstin"
                  type="text"
                  name="gstin"
                  value={formData.gstin}
                  onChange={handleChange}
                  placeholder="24AAACS0000A1Z5"
                  autoComplete="off"
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Owner information */}
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Business Owner Account
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="ownerName"
                    className="block text-xs text-slate-600 font-medium"
                  >
                    Owner Full Name
                  </label>

                  <input
                    id="ownerName"
                    type="text"
                    name="ownerName"
                    required
                    value={formData.ownerName}
                    onChange={handleChange}
                    placeholder="Rajesh Shah"
                    autoComplete="name"
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-xs text-slate-600 font-medium"
                  >
                    WhatsApp Phone
                  </label>

                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+919876543210"
                    autoComplete="tel"
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Login credentials */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs text-slate-600 font-medium"
              >
                Work Email Address
              </label>

              <input
                id="email"
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="rajesh@suratsilk.com"
                autoComplete="email"
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs text-slate-600 font-medium"
              >
                Password (8+ characters)
              </label>

              <input
                id="password"
                type="password"
                name="password"
                required
                minLength={8}
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter a strong password"
                autoComplete="new-password"
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <Button
              type="submit"
              loading={loading}
              disabled={loading}
              className="w-full py-2.5 mt-2"
            >
              Create Organization &amp; Start
            </Button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
