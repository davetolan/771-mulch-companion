'use client'

import { QRCodeSVG } from 'qrcode.react'

type FlyerProps = {
  scoutName: string
  fundraiserUrl: string
  orderDeadline: string
  deliveryDate: string
  phone?: string
  email: string
  troopNumber?: string
  products?: string[]
  backgroundImageUrl?: string
}

const defaultProducts = ['Black', 'Hardwood', 'Cedar', 'Compost', 'Soil']

export default function MulchDoorHangerFlyer({
  scoutName,
  fundraiserUrl,
  orderDeadline,
  deliveryDate,
  phone,
  email,
  troopNumber = '771',
  products = defaultProducts,
  backgroundImageUrl = '/images/scout-flag.jpg.png',
}: FlyerProps) {
  return (
    <div className="mx-auto w-full max-w-[1100px] bg-white p-4 print:max-w-none print:p-0">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 print:grid-cols-2 print:gap-3">
        <FlyerPanel
          scoutName={scoutName}
          fundraiserUrl={fundraiserUrl}
          orderDeadline={orderDeadline}
          deliveryDate={deliveryDate}
          phone={phone}
          email={email}
          troopNumber={troopNumber}
          products={products}
          backgroundImageUrl={backgroundImageUrl}
        />
        <FlyerPanel
          scoutName={scoutName}
          fundraiserUrl={fundraiserUrl}
          orderDeadline={orderDeadline}
          deliveryDate={deliveryDate}
          phone={phone}
          email={email}
          troopNumber={troopNumber}
          products={products}
          backgroundImageUrl={backgroundImageUrl}
        />
      </div>
    </div>
  )
}

function FlyerPanel({
  scoutName,
  fundraiserUrl,
  orderDeadline,
  deliveryDate,
  phone,
  email,
  troopNumber,
  products,
  backgroundImageUrl,
}: FlyerProps) {
  return (
    <section className="flex min-h-[1450px] flex-col overflow-hidden rounded-2xl border-2 border-blue-800 bg-neutral-100 text-blue-900 print:min-h-[1450px] print:rounded-none">
      <div className="relative">
        <div
          className="h-[380px] w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImageUrl})` }}
        />
      </div>

      <div className="px-8 pb-8 pt-14">
        <h2 className="text-center text-[38px] font-extrabold leading-tight text-blue-800">
          My name is {scoutName}
        </h2>

        <p className="mt-8 text-[24px] leading-[1.35] text-blue-900">
          I would like to speak to you about our Scout Spring fundraiser; We offer high quality
          professional mulch from Jemasco only available to landscapers and Scouts!
        </p>

        <p className="mt-8 text-center text-[22px] font-extrabold text-red-600">
          {(products ?? defaultProducts).join(', ')}
        </p>

        <InfoCard className="mt-8">
          <div className="text-[20px] leading-tight text-blue-900">
            <p>
              <span className="font-semibold">Order Deadline:</span>{' '}
              <span className="font-extrabold text-red-600">{orderDeadline}</span>
            </p>
            <p className="mt-2 font-semibold">Questions?</p>
            {phone ? <p>Call/Text: {phone}</p> : <p>Call/Text:</p>}
            <p>Email: {email}</p>
          </div>
        </InfoCard>

        <InfoCard className="mt-5">
          <div className="text-center text-[28px] font-extrabold leading-tight text-red-600">
            <p className="mb-1 text-[20px] text-blue-800">Delivery On</p>
            <p>{deliveryDate}</p>
          </div>
        </InfoCard>

        <InfoCard className="mt-5">
          <div className="flex flex-col items-center">
            <p className="mb-2 text-[22px] font-extrabold text-red-600">Order Today!</p>
            <div className="rounded-xl bg-white p-2">
              <QRCodeSVG value={fundraiserUrl} size={150} />
            </div>
          </div>
        </InfoCard>

        <p className="mt-10 text-center text-[22px] font-semibold leading-snug text-blue-800">
          All sales proceeds assist in sending Scouts to summer camp and fund needed equipment.
        </p>

        <div className="mt-10 text-center">
          <p className="text-[26px] font-black uppercase tracking-wide text-blue-700">
            Thank you for supporting
          </p>
          <p className="text-[52px] font-black uppercase leading-none tracking-wide text-blue-800">
            Troop {troopNumber}
          </p>
        </div>
      </div>
    </section>
  )
}

function InfoCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[26px] border-2 border-blue-700 bg-neutral-100 px-5 py-5 ${className}`}
    >
      {children}
    </div>
  )
}
