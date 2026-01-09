"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Warehouse,
  LayoutGrid,
  ArrowDownToLine,
  ArrowUpFromLine,
  MoveHorizontal,
  Square,
  Package,
  Layers,
  ClipboardCheck,
  Truck,
  DoorOpen,
  Folder,
  Trash2,
  Plus,
  Pencil,
  Settings,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/trpc/react"
import type { Category } from "@/server/db/schema"

const iconMap: Record<string, LucideIcon> = {
  Warehouse,
  LayoutGrid,
  ArrowDownToLine,
  ArrowUpFromLine,
  MoveHorizontal,
  Square,
  Package,
  Layers,
  ClipboardCheck,
  Truck,
  DoorOpen,
  Folder,
}

const iconOptions = Object.keys(iconMap)

export default function ElementsPage() {
  const { data: elements, isLoading: elementsLoading } =
    api.element.getAll.useQuery()
  const { data: categories, isLoading: categoriesLoading } =
    api.category.getAll.useQuery()
  const utils = api.useUtils()

  const deleteMutation = api.element.delete.useMutation({
    onSuccess: () => {
      utils.element.getAll.invalidate()
    },
    onError: (error) => {
      alert(error.message)
    },
  })

  const handleDeleteElement = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate({ id })
    }
  }

  const elementsByCategory = elements?.reduce(
    (acc, element) => {
      const catId = element.categoryId || "uncategorized"
      if (!acc[catId]) {
        acc[catId] = []
      }
      acc[catId].push(element)
      return acc
    },
    {} as Record<string, typeof elements>
  )

  const isLoading = elementsLoading || categoriesLoading

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Elements</h1>
          <p className="text-muted-foreground">
            Manage element templates and categories
          </p>
        </div>
        <div className="flex gap-2">
          <CategoryManageDialog categories={categories || []} />
          <Button asChild>
            <Link href="/elements/new">
              <Plus className="mr-2 h-4 w-4" />
              New Element
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              All
              {elements?.length ? (
                <Badge variant="secondary" className="ml-2">
                  {elements.length}
                </Badge>
              ) : null}
            </TabsTrigger>
            {categories?.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id}>
                {cat.name}
                {elementsByCategory?.[cat.id]?.length ? (
                  <Badge variant="secondary" className="ml-2">
                    {elementsByCategory[cat.id]?.length}
                  </Badge>
                ) : null}
              </TabsTrigger>
            ))}
            {elementsByCategory?.["uncategorized"]?.length ? (
              <TabsTrigger value="uncategorized">
                Uncategorized
                <Badge variant="secondary" className="ml-2">
                  {elementsByCategory["uncategorized"]?.length}
                </Badge>
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {elements && elements.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {elements.map((element) => (
                  <ElementCard
                    key={element.id}
                    element={element}
                    onDelete={() =>
                      handleDeleteElement(element.id, element.name)
                    }
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </div>
            ) : (
              <EmptyState hasCategories={(categories?.length || 0) > 0} />
            )}
          </TabsContent>

          {categories?.map((category) => (
            <TabsContent
              key={category.id}
              value={category.id}
              className="space-y-4"
            >
              {elementsByCategory?.[category.id]?.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {elementsByCategory[category.id]?.map((element) => (
                    <ElementCard
                      key={element.id}
                      element={element}
                      onDelete={() =>
                        handleDeleteElement(element.id, element.name)
                      }
                      isDeleting={deleteMutation.isPending}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
                  <p className="text-sm text-muted-foreground">
                    No elements in this category
                  </p>
                </div>
              )}
            </TabsContent>
          ))}

          <TabsContent value="uncategorized" className="space-y-4">
            {elementsByCategory?.["uncategorized"]?.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {elementsByCategory["uncategorized"]?.map((element) => (
                  <ElementCard
                    key={element.id}
                    element={element}
                    onDelete={() =>
                      handleDeleteElement(element.id, element.name)
                    }
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

interface ElementWithCategory {
  id: string
  name: string
  categoryId: string | null
  excalidrawData: unknown
  icon: string
  defaultWidth: number
  defaultHeight: number
  isSystem: boolean
  createdAt: Date
  category: Category | null
}

interface ElementCardProps {
  element: ElementWithCategory
  onDelete: () => void
  isDeleting: boolean
}

function ElementCard({ element, onDelete, isDeleting }: ElementCardProps) {
  const Icon = iconMap[element.icon] || Square
  const bgColor = element.category?.bgColor || "#6b7280"

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded"
              style={{ backgroundColor: bgColor }}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">{element.name}</CardTitle>
              <CardDescription>
                {element.defaultWidth} x {element.defaultHeight}
              </CardDescription>
            </div>
          </div>
          {element.category && (
            <Badge
              variant="outline"
              style={{ color: element.category.bgColor }}
            >
              {element.category.name}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {element.category?.name || "Uncategorized"}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href={`/elements/${element.id}/edit`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ hasCategories }: { hasCategories: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
      <Package className="h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold">No elements yet</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {hasCategories
          ? "Create custom elements for your warehouse layouts"
          : "Create a category first, then add elements"}
      </p>
      <div className="mt-6">
        <Button asChild>
          <Link href="/elements/new">
            <Plus className="mr-2 h-4 w-4" />
            New Element
          </Link>
        </Button>
      </div>
    </div>
  )
}

interface CategoryManageDialogProps {
  categories: Category[]
}

function CategoryManageDialog({ categories }: CategoryManageDialogProps) {
  const [open, setOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [name, setName] = useState("")
  const [bgColor, setBgColor] = useState("#6b7280")
  const [strokeColor, setStrokeColor] = useState("#374151")
  const [icon, setIcon] = useState("Folder")

  const utils = api.useUtils()

  const createMutation = api.category.create.useMutation({
    onSuccess: () => {
      utils.category.getAll.invalidate()
      resetForm()
    },
  })

  const updateMutation = api.category.update.useMutation({
    onSuccess: () => {
      utils.category.getAll.invalidate()
      resetForm()
    },
  })

  const deleteMutation = api.category.delete.useMutation({
    onSuccess: () => {
      utils.category.getAll.invalidate()
      utils.element.getAll.invalidate()
    },
  })

  const resetForm = () => {
    setEditingCategory(null)
    setName("")
    setBgColor("#6b7280")
    setStrokeColor("#374151")
    setIcon("Folder")
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setName(category.name)
    setBgColor(category.bgColor)
    setStrokeColor(category.strokeColor)
    setIcon(category.icon)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id,
        name: name.trim(),
        bgColor,
        strokeColor,
        icon,
      })
    } else {
      createMutation.mutate({
        name: name.trim(),
        bgColor,
        strokeColor,
        icon,
      })
    }
  }

  const handleDelete = (category: Category) => {
    if (
      confirm(
        `Delete "${category.name}"? Elements in this category will become uncategorized.`
      )
    ) {
      deleteMutation.mutate({ id: category.id })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="mr-2 h-4 w-4" />
          Categories
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
          <DialogDescription>
            Create and manage element categories
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Category List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Existing Categories</h4>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories yet</p>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => {
                  const Icon = iconMap[category.icon] || Folder
                  return (
                    <div
                      key={category.id}
                      className="flex items-center justify-between rounded-md border p-2"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded"
                          style={{ backgroundColor: category.bgColor }}
                        >
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-sm font-medium">
                          {category.name}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(category)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Category Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <h4 className="text-sm font-medium">
              {editingCategory ? "Edit Category" : "New Category"}
            </h4>
            <div className="space-y-2">
              <label className="text-sm">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category name"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm">Background Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="h-10 w-12 cursor-pointer rounded border"
                  />
                  <Input
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm">Stroke Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="h-10 w-12 cursor-pointer rounded border"
                  />
                  <Input
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm">Icon</label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((iconName) => {
                    const IconComponent = iconMap[iconName] || Folder
                    return (
                      <SelectItem key={iconName} value={iconName}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          {iconName}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              {editingCategory && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending
                  ? "Saving..."
                  : editingCategory
                    ? "Update"
                    : "Create"}
              </Button>
            </div>
          </form>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
