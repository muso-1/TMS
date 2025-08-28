import { useEffect, useState } from "react";

export default function Units() {
  const [units, setUnits] = useState([]);
  const [form, setForm] = useState({ name: "", status: "vacant" });
  const [loading, setLoading] = useState(false);

  // Fetch units
  useEffect(() => {
    fetch("http://localhost:5000/api/units")
      .then((res) => res.json())
      .then(setUnits)
      .catch((err) => console.error(err));
  }, []);

  // Handle form change
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // Add unit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setUnits([...units, data]);
      setForm({ name: "", status: "vacant" });
    } catch (error) {
      console.error("Error adding unit", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Units</h1>

      {/* Unit List */}
      <table className="w-full border mb-6">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2 text-left">ID</th>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => (
            <tr key={unit.id} className="border-t">
              <td className="p-2">{unit.id}</td>
              <td className="p-2">{unit.name}</td>
              <td className="p-2">{unit.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add Unit Form */}
      <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
        <input
          type="text"
          name="name"
          value={form.name}
          placeholder="Unit name"
          onChange={handleChange}
          className="border p-2 w-full"
          required
        />
        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          className="border p-2 w-full"
        >
          <option value="vacant">Vacant</option>
          <option value="occupied">Occupied</option>
        </select>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? "Saving..." : "Add Unit"}
        </button>
      </form>
    </div>
  );
}
