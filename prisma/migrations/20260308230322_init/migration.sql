-- CreateTable
CREATE TABLE "BusinessInfo" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "businessName" TEXT NOT NULL DEFAULT '',
    "tradeName" TEXT NOT NULL DEFAULT '',
    "representativeName" TEXT NOT NULL DEFAULT '',
    "postalCode" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "invoiceRegistrationNo" TEXT NOT NULL DEFAULT '',
    "logoPath" TEXT NOT NULL DEFAULT '',
    "sealPath" TEXT NOT NULL DEFAULT '',
    "defaultHonorific" TEXT NOT NULL DEFAULT '御中',
    "defaultNotes" TEXT NOT NULL DEFAULT '',
    "taxCalculation" TEXT NOT NULL DEFAULT 'exclusive',
    "roundingMethod" TEXT NOT NULL DEFAULT 'floor',
    "defaultPaymentTerms" TEXT NOT NULL DEFAULT '',
    "defaultBankAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientType" TEXT NOT NULL DEFAULT 'corporate',
    "department" TEXT NOT NULL DEFAULT '',
    "contactPerson" TEXT NOT NULL DEFAULT '',
    "honorific" TEXT NOT NULL DEFAULT '御中',
    "postalCode" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "paymentTerms" TEXT NOT NULL DEFAULT '',
    "defaultSubject" TEXT NOT NULL DEFAULT '',
    "defaultNotes" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '',
    "bankAccountId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT '',
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "defaultQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT NOT NULL DEFAULT '',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "branchName" TEXT NOT NULL DEFAULT '',
    "accountType" TEXT NOT NULL DEFAULT 'ordinary',
    "accountNumber" TEXT NOT NULL DEFAULT '',
    "accountHolder" TEXT NOT NULL DEFAULT '',
    "displayText" TEXT NOT NULL DEFAULT '',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "issueDate" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "deliveryPlace" TEXT,
    "paymentDueDate" TIMESTAMP(3),
    "bankAccountId" TEXT,
    "bankAccountText" TEXT NOT NULL DEFAULT '',
    "withholdingTax" BOOLEAN NOT NULL DEFAULT false,
    "withholdingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receiptDate" TIMESTAMP(3),
    "addressee" TEXT,
    "proviso" TEXT,
    "paymentMethod" TEXT,
    "isReissue" BOOLEAN NOT NULL DEFAULT false,
    "showStampNotice" BOOLEAN NOT NULL DEFAULT false,
    "clientId" TEXT,
    "clientDisplayName" TEXT NOT NULL DEFAULT '',
    "clientDepartment" TEXT NOT NULL DEFAULT '',
    "clientContactName" TEXT NOT NULL DEFAULT '',
    "clientHonorific" TEXT NOT NULL DEFAULT '御中',
    "clientAddress" TEXT NOT NULL DEFAULT '',
    "subject" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "internalMemo" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pdfPath" TEXT NOT NULL DEFAULT '',
    "sourceJson" TEXT NOT NULL DEFAULT '',
    "sourceDocumentId" TEXT,
    "relatedDocIds" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentItem" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3),
    "productName" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT '',
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "taxCategory" TEXT NOT NULL DEFAULT 'taxable_10',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "memo" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumberSequence" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT '',
    "yearReset" BOOLEAN NOT NULL DEFAULT true,
    "currentYear" INTEGER NOT NULL DEFAULT 2026,
    "currentSeq" INTEGER NOT NULL DEFAULT 0,
    "digits" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumberSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "showLogo" BOOLEAN NOT NULL DEFAULT true,
    "showSeal" BOOLEAN NOT NULL DEFAULT true,
    "defaultMarginTop" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "defaultMarginRight" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "defaultMarginBottom" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "defaultMarginLeft" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "showDeliveryDate" BOOLEAN NOT NULL DEFAULT true,
    "showItemDate" BOOLEAN NOT NULL DEFAULT false,
    "showItemMemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_documentType_idx" ON "Document"("documentType");

-- CreateIndex
CREATE INDEX "Document_clientId_idx" ON "Document"("clientId");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE INDEX "Document_issueDate_idx" ON "Document"("issueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Document_documentType_documentNumber_key" ON "Document"("documentType", "documentNumber");

-- CreateIndex
CREATE INDEX "DocumentItem_documentId_idx" ON "DocumentItem"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "NumberSequence_documentType_key" ON "NumberSequence"("documentType");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentItem" ADD CONSTRAINT "DocumentItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
