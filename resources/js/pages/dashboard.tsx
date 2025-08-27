import BranchSelect from "@/components/public-components/branch-select"
import TextHeader from "@/components/reusable-components/text-header"
import AppLayout from "@/layouts/app-layout"
import PickerMonth from "@/components/public-components/month-picker"

export default function Page() {
  return (
   <AppLayout>
     <div className="flex items-center justify-between">
      <TextHeader title="Dashboard" />

      <div className="flex items-center gap-2">
      <BranchSelect/>
      <PickerMonth/>
      </div>
     </div>
   </AppLayout>
  )
}
