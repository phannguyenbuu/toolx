import React from 'react';
import { TabType, QRFormData } from '../../types';

interface QRContactInputsProps {
  activeTab: TabType;
  data: QRFormData;
  setData: React.Dispatch<React.SetStateAction<QRFormData>>;
}

export const QRContactInputs: React.FC<QRContactInputsProps> = ({
  activeTab,
  data,
  setData
}) => {
  return (
    <>
      {activeTab === 'email' && (
        <>
          <input
            type="email"
            value={data.email.to}
            onChange={(e) =>
              setData({ ...data, email: { ...data.email, to: e.target.value } })
            }
            placeholder="Email nhận"
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
          />
          <input
            type="text"
            value={data.email.subject}
            onChange={(e) =>
              setData({
                ...data,
                email: { ...data.email, subject: e.target.value }
              })
            }
            placeholder="Tiêu đề"
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
          />
          <textarea
            value={data.email.body}
            onChange={(e) =>
              setData({
                ...data,
                email: { ...data.email, body: e.target.value }
              })
            }
            placeholder="Nội dung"
            rows={3}
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm resize-none"
          />
        </>
      )}

      {activeTab === 'sms' && (
        <>
          <input
            type="tel"
            value={data.sms.phone}
            onChange={(e) =>
              setData({ ...data, sms: { ...data.sms, phone: e.target.value } })
            }
            placeholder="Số điện thoại"
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
          />
          <textarea
            value={data.sms.message}
            onChange={(e) =>
              setData({
                ...data,
                sms: { ...data.sms, message: e.target.value }
              })
            }
            placeholder="Tin nhắn"
            rows={3}
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm resize-none"
          />
        </>
      )}

      {activeTab === 'whatsapp' && (
        <>
          <input
            type="tel"
            value={data.whatsapp.phone}
            onChange={(e) =>
              setData({
                ...data,
                whatsapp: { ...data.whatsapp, phone: e.target.value }
              })
            }
            placeholder="Số điện thoại (không dấu +)"
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
          />
          <textarea
            value={data.whatsapp.text}
            onChange={(e) =>
              setData({
                ...data,
                whatsapp: { ...data.whatsapp, text: e.target.value }
              })
            }
            placeholder="Nội dung"
            rows={3}
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm resize-none"
          />
        </>
      )}

      {activeTab === 'telegram' && (
        <input
          type="text"
          value={data.telegram.username}
          onChange={(e) =>
            setData({
              ...data,
              telegram: { ...data.telegram, username: e.target.value }
            })
          }
          placeholder="username (không @)"
          className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
        />
      )}

      {activeTab === 'vcard' && (
        <>
          <input
            type="text"
            value={data.vcard.fn}
            onChange={(e) =>
              setData({ ...data, vcard: { ...data.vcard, fn: e.target.value } })
            }
            placeholder="Họ tên"
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
          />
          <input
            type="tel"
            value={data.vcard.phone}
            onChange={(e) =>
              setData({
                ...data,
                vcard: { ...data.vcard, phone: e.target.value }
              })
            }
            placeholder="Điện thoại"
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
          />
          <input
            type="email"
            value={data.vcard.email}
            onChange={(e) =>
              setData({
                ...data,
                vcard: { ...data.vcard, email: e.target.value }
              })
            }
            placeholder="Email"
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
          />
          <input
            type="text"
            value={data.vcard.org}
            onChange={(e) =>
              setData({
                ...data,
                vcard: { ...data.vcard, org: e.target.value }
              })
            }
            placeholder="Tổ chức"
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
          />
          <input
            type="text"
            value={data.vcard.title}
            onChange={(e) =>
              setData({
                ...data,
                vcard: { ...data.vcard, title: e.target.value }
              })
            }
            placeholder="Chức danh"
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
          />
        </>
      )}
    </>
  );
};
