-- AlterTable
ALTER TABLE "RegressionAlert" ADD COLUMN "fixItSuggestions" TEXT,
ADD COLUMN "fixItSuggestionsAt" TIMESTAMP(3),
ADD COLUMN "fixItSuggestionsModel" TEXT;
