import React, { useState } from 'react';

export function NewShowModal({ onClose, onSubmit }) {
    const [formData, setFormData] = useState({
        name: '',
        venue: '',
        designer: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1e1e1e] p-6 rounded shadow-lg border border-[#333] w-96">
                <h2 className="text-lg font-semibold text-white mb-4">Create New Show</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-[#a0a0a0] text-xs">Show Name</label>
                        <input
                            className="bg-[#2c2c2c] border border-[#444] text-white p-2 text-sm rounded focus:border-[#007acc] outline-none"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                            autoFocus
                            placeholder="e.g. Hamilton"
                            autoComplete="off"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[#a0a0a0] text-xs">Venue</label>
                        <input
                            className="bg-[#2c2c2c] border border-[#444] text-white p-2 text-sm rounded focus:border-[#007acc] outline-none"
                            value={formData.venue}
                            onChange={e => setFormData({ ...formData, venue: e.target.value })}
                            placeholder="e.g. Richard Rodgers Theatre"
                            autoComplete="off"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[#a0a0a0] text-xs">Designer</label>
                        <input
                            className="bg-[#2c2c2c] border border-[#444] text-white p-2 text-sm rounded focus:border-[#007acc] outline-none"
                            value={formData.designer}
                            onChange={e => setFormData({ ...formData, designer: e.target.value })}
                            placeholder="e.g. Howell Binkley"
                            autoComplete="off"
                        />
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                        <button type="button" onClick={onClose} className="px-3 py-1 text-sm text-[#a0a0a0] hover:text-white">Cancel</button>
                        <button type="submit" className="px-4 py-1 text-sm bg-[#007acc] text-white rounded hover:bg-[#0063a5]">Create</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
